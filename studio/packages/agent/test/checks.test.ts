import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CHECKS_FILE, parseChecks, type JobEvent, type VerificationCheck } from "@rea-studio/core";
import { afterEach, describe, expect, it } from "vitest";

import type { ToolContext } from "../src/context.js";
import { nodeSupported, runPreflight } from "../src/preflight.js";
import { Redactor } from "../src/redact.js";
import { Workspace, workspaceTools } from "../src/workspace.js";

const context = (events: JobEvent[], approve: boolean, mode: "ask" | "auto"): ToolContext => {
  let seq = 0;
  return {
    phase: "verify",
    emit: (event) => events.push(event),
    redactor: new Redactor([{ value: "hunter2-secret", label: "password" }]),
    approvals: { request: async () => ({ approved: approve }) },
    policy: { destructiveTools: mode, commands: mode, specReview: false },
    signal: new AbortController().signal,
    nextSeq: () => (seq += 1),
  };
};

const run = (tools: ReturnType<typeof workspaceTools>, input: Record<string, unknown>) =>
  (tools.run_check?.execute as (input: unknown, options: unknown) => Promise<string>)(input, {
    toolCallId: "call-1",
    messages: [],
  });

describe("run_check", () => {
  let root: string | undefined;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("runs the command itself and records its exit code where the model cannot write", async () => {
    root = await mkdtemp(join(tmpdir(), "reall-check-"));
    const ws = new Workspace(root);
    await ws.prepare();
    const events: JobEvent[] = [];
    const recorded: VerificationCheck[] = [];
    const tools = workspaceTools(ws, context(events, true, "auto"), {
      write: true,
      commands: true,
      onCheck: (check) => recorded.push(check),
    });
    await run(tools, { name: "passes", command: "echo ok hunter2-secret", cwd: "output", timeout_seconds: 30 });
    await run(tools, { name: "fails", command: "exit 3", cwd: "output", timeout_seconds: 30 });

    expect(recorded.map((check) => [check.name, check.passed, check.exitCode])).toEqual([
      ["passes", true, 0],
      ["fails", false, 3],
    ]);
    const log = parseChecks(await readFile(join(root, CHECKS_FILE), "utf8"));
    expect(log).toHaveLength(2);
    expect(JSON.stringify(log)).not.toContain("hunter2-secret");
    expect(events.filter((event) => event.type === "check")).toHaveLength(2);
    // The model's file tools cannot overwrite the log.
    expect(() => ws.resolveWritable(CHECKS_FILE)).toThrow(/limited/);
  });

  it("records nothing when the user declines the check", async () => {
    root = await mkdtemp(join(tmpdir(), "reall-check-"));
    const ws = new Workspace(root);
    await ws.prepare();
    const recorded: VerificationCheck[] = [];
    const tools = workspaceTools(ws, context([], false, "ask"), {
      write: false,
      commands: true,
      onCheck: (check) => recorded.push(check),
    });
    const result = await run(tools, { name: "tests", command: "true", cwd: "output", timeout_seconds: 30 });
    expect(result).toMatch(/declined/);
    expect(recorded).toEqual([]);
  });

  it("is only offered when the phase records checks", async () => {
    root = await mkdtemp(join(tmpdir(), "reall-check-"));
    const ws = new Workspace(root);
    const tools = workspaceTools(ws, context([], true, "auto"), { write: true, commands: true });
    expect(tools.run_check).toBeUndefined();
  });
});

describe("preflight", () => {
  it("accepts the engine ranges in package.json", () => {
    expect(nodeSupported("24.22.1")).toBe(true);
    expect(nodeSupported("v24.30.0")).toBe(true);
    expect(nodeSupported("24.21.9")).toBe(false);
    expect(nodeSupported("22.23.4")).toBe(true);
    expect(nodeSupported("23.1.0")).toBe(false);
    expect(nodeSupported("26.12.1")).toBe(true);
    expect(nodeSupported("27.0.0")).toBe(true);
    expect(nodeSupported("20.0.0")).toBe(false);
  });

  it("checks only what each kind of target needs", () => {
    const ids = (kind: "web" | "android" | "javascript", accessMode?: "connect") =>
      runPreflight({ kind, ...(accessMode ? { accessMode } : {}), env: { PATH: "" }, nodeVersion: "24.22.1" }).map(
        (check) => check.id,
      );
    expect(ids("web")).toEqual(["node", "rea", "browser"]);
    expect(ids("web", "connect")).toEqual(["node", "rea"]);
    expect(ids("javascript")).toEqual(["node", "rea"]);
    expect(ids("android")).toEqual(["node", "rea", "java", "jadx"]);
    const jadx = runPreflight({ kind: "android", env: { PATH: "", REA_JADX_MCP_JAR: "relative.jar" } }).find(
      (check) => check.id === "jadx",
    );
    expect(jadx?.status).toBe("fail");
  });
});
