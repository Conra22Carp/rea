import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { translateMessage } from "./messages.js";
import { PRICE_STALE_DAYS, priceAgeDays } from "./pricing.js";
import { StudioStore } from "./store.js";
import type { VerificationCheck } from "./types.js";
import { parseJobSpec } from "./validation.js";
import { parseChecks, parseFindings, summarizeChecks } from "./verification.js";
import { acquireWorkerLock, heartbeatPath, HEARTBEAT_FRESH_MS } from "./worker-lock.js";

const roots: string[] = [];
const stores: StudioStore[] = [];
const tempRoot = () => {
  // The store resolves symlinks; on macOS tmpdir() is under the /var symlink.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "reall-v1-")));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const check = (name: string, passed: boolean): VerificationCheck => ({
  name,
  command: `run ${name}`,
  cwd: "output",
  exitCode: passed ? 0 : 1,
  passed,
  timedOut: false,
  durationMs: 10,
  outputTail: "",
  finishedAt: new Date().toISOString(),
});

describe("verification summary", () => {
  it("is unverified without checks and failed when any latest check fails", () => {
    expect(summarizeChecks([])).toEqual({ status: "unverified", passed: 0, failed: 0, total: 0 });
    expect(summarizeChecks([check("tests", true), check("build", false)])).toMatchObject({
      status: "failed",
      passed: 1,
      failed: 1,
      total: 2,
    });
  });

  it("lets a check that was run again after a fix replace its earlier result", () => {
    const summary = summarizeChecks([check("tests", false), check("tests", true), check("build", true)]);
    expect(summary).toEqual({ status: "verified", passed: 2, failed: 0, total: 2 });
  });

  it("treats an unreadable checks log as no checks", () => {
    expect(parseChecks("not json")).toEqual([]);
    expect(parseChecks(JSON.stringify([{ name: "x" }]))).toEqual([]);
    expect(parseChecks(JSON.stringify([check("tests", true)]))).toHaveLength(1);
  });
});

describe("findings", () => {
  it("keeps valid claims and counts malformed ones", () => {
    const { findings, rejected } = parseFindings(
      JSON.stringify([
        { claim: "Search ignores case", kind: "observed", evidence: ["ev_1"], check: "unit tests" },
        { claim: "Probably uses an index", kind: "inferred" },
        { claim: "", kind: "observed" },
        { claim: "Bad kind", kind: "guess" },
      ]),
    );
    expect(findings).toEqual([
      { claim: "Search ignores case", kind: "observed", evidence: ["ev_1"], check: "unit tests" },
      { claim: "Probably uses an index", kind: "inferred", evidence: [] },
    ]);
    expect(rejected).toBe(2);
  });

  it("rejects a file that is not a JSON array", () => {
    expect(parseFindings("{}")).toEqual({ findings: [], rejected: 1 });
    expect(parseFindings("oops")).toEqual({ findings: [], rejected: 1 });
  });
});

describe("messages", () => {
  it("translates known backend messages and leaves external text alone", () => {
    expect(translateMessage("Model not found.", "es")).toBe("No se encontró el modelo.");
    expect(translateMessage("Model not found.", "en")).toBe("Model not found.");
    expect(translateMessage("Connection failed: 401 Unauthorized", "es")).toBe(
      "La conexión falló: 401 Unauthorized",
    );
    expect(translateMessage("ECONNREFUSED 127.0.0.1:11434", "es")).toBe("ECONNREFUSED 127.0.0.1:11434");
  });
});

describe("price age", () => {
  it("counts whole days and ignores custom rates without a date", () => {
    const now = Date.parse("2026-12-01T10:00:00Z");
    expect(priceAgeDays({ checkedAt: "2026-10-27" }, now)).toBe(35);
    expect((priceAgeDays({ checkedAt: "2026-10-27" }, now) ?? 0) > PRICE_STALE_DAYS).toBe(true);
    expect(priceAgeDays({ checkedAt: "" }, now)).toBeUndefined();
  });
});

const spec = parseJobSpec({
  title: "History",
  target: { kind: "web", url: "http://localhost:5173" },
  access: { mode: "none" },
  scope: { mode: "full", description: "" },
  enhancement: { hardening: [] },
  budget: { maxStepsPerPhase: 5 },
  approvals: { destructiveTools: "ask", commands: "ask", specReview: true },
  authorizationAttested: true,
});

const openStore = () => {
  const root = tempRoot();
  const store = new StudioStore(root);
  stores.push(store);
  const model = store.createModel({ name: "GPT", provider: "openai", model: "gpt-5-mini" });
  const project = store.createProject({
    name: "Notes",
    description: "",
    modelId: model.id,
    outputDirectory: join(root, "projects"),
  });
  const job = store.createJob({ spec, secrets: {}, analysisModelId: model.id, buildModelId: model.id, projectId: project.id });
  return { store, project, job };
};

describe("store: ownership, changes and history", () => {
  it("records the claiming worker and the verification of a run", () => {
    const { store, job } = openStore();
    expect(store.claimNextJob("worker-a")?.workerId).toBe("worker-a");
    store.setJobVerification(job.id, { status: "verified", passed: 2, failed: 0, total: 2 });
    expect(store.getJob(job.id)?.verification).toEqual({ status: "verified", passed: 2, failed: 0, total: 2 });
  });

  it("summarizes files and commands and maps evidence ids to saved files", () => {
    const { store, job } = openStore();
    store.appendEvent(job.id, { type: "file", path: "output/a.js", action: "write" });
    store.appendEvent(job.id, { type: "file", path: "output/a.js", action: "edit" });
    store.appendEvent(job.id, { type: "file", path: "notes/n.md", action: "edit" });
    store.appendEvent(job.id, { type: "tool-call", phase: "verify", toolCallId: "1", tool: "run_check", source: "workspace", input: JSON.stringify({ name: "tests", command: "npm test" }) });
    store.appendEvent(job.id, { type: "tool-call", phase: "analysis", toolCallId: "2", tool: "read_file", source: "workspace", input: "{}" });
    store.appendEvent(job.id, { type: "tool-result", phase: "analysis", toolCallId: "3", tool: "inspect_web_page", ok: true, preview: "", evidenceIds: ["ev_1", "ev_2"], savedTo: "evidence/0001-inspect.json" });
    expect(store.jobChanges(job.id)).toEqual({
      files: [
        { path: "output/a.js", action: "write" },
        { path: "notes/n.md", action: "edit" },
      ],
      commands: ["npm test"],
    });
    expect(store.evidenceFiles(job.id)).toEqual({ ev_1: "evidence/0001-inspect.json", ev_2: "evidence/0001-inspect.json" });
  });

  it("removes only finished runs, keeping their files on disk", () => {
    const { store, job } = openStore();
    expect(() => store.deleteJob(job.id)).toThrow("Only finished runs can be removed.");
    store.setJobStatus(job.id, "succeeded");
    store.appendEvent(job.id, { type: "log", level: "info", message: "x" });
    expect(store.deleteJob(job.id).workspace).toBe(job.workspace);
    expect(store.getJob(job.id)).toBeUndefined();
    expect(store.listEvents(job.id)).toEqual([]);
  });

  it("refuses to remove a project with active runs, then removes it with its history", () => {
    const { store, project, job } = openStore();
    expect(() => store.deleteProject(project.id)).toThrow("Finish or cancel this project's active runs first.");
    store.setJobStatus(job.id, "failed", "x");
    expect(store.deleteProject(project.id).id).toBe(project.id);
    expect(store.getProject(project.id)).toBeUndefined();
    expect(store.getJob(job.id)).toBeUndefined();
  });
});

describe("worker lock", () => {
  it("lets one worker hold a state folder and refuses a second live one", () => {
    const home = tempRoot();
    const first = acquireWorkerLock(home);
    expect(first.ok).toBe(true);
    writeFileSync(heartbeatPath(home), new Date().toISOString());
    const second = acquireWorkerLock(home);
    expect(second).toMatchObject({ ok: false, holder: { pid: process.pid } });
    if (first.ok) first.lock.release();
    expect(acquireWorkerLock(home).ok).toBe(true);
  });

  it("replaces a lock whose process is gone", () => {
    const home = tempRoot();
    // A pid that existed and has exited.
    const gone = spawnSync(process.execPath, ["-e", "0"]).pid;
    writeFileSync(join(home, "worker.lock"), JSON.stringify({ id: "old", pid: gone, startedAt: new Date().toISOString() }));
    expect(acquireWorkerLock(home).ok).toBe(true);
  });

  it("replaces a lock whose heartbeat went stale even if the pid exists", () => {
    const home = tempRoot();
    const now = Date.now();
    const long = new Date(now - 10 * HEARTBEAT_FRESH_MS).toISOString();
    writeFileSync(join(home, "worker.lock"), JSON.stringify({ id: "old", pid: process.pid, startedAt: long }));
    writeFileSync(heartbeatPath(home), long);
    expect(acquireWorkerLock(home, now).ok).toBe(true);
  });
});
