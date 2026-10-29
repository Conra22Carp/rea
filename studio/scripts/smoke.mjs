#!/usr/bin/env node
// End-to-end smoke test of a built Reall: start it on a temporary state
// folder, exercise pages and the session guard over HTTP, and confirm that a
// second worker on the same state is refused.
//   npm run build && npm run smoke
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const home = mkdtempSync(join(tmpdir(), "reall-smoke-"));
const port = process.env.SMOKE_PORT ?? "4410";
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, STUDIO_HOME: home, STUDIO_PORT: port, NEXT_TELEMETRY_DISABLED: "1" };

const app = spawn(process.execPath, [join(root, "scripts", "studio.mjs")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
app.stdout.on("data", (chunk) => (log += chunk));
app.stderr.on("data", (chunk) => (log += chunk));

const failures = [];
const expect = (ok, message) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
  if (!ok) failures.push(message);
};

const stop = async () => {
  if (app.exitCode === null) {
    app.kill("SIGTERM");
    await new Promise((done) => {
      const timer = setTimeout(done, 8_000);
      app.once("exit", () => {
        clearTimeout(timer);
        done();
      });
    });
  }
  rmSync(home, { recursive: true, force: true });
};

try {
  const deadline = Date.now() + 240_000;
  for (;;) {
    if (app.exitCode !== null) throw new Error(`Reall exited early (code ${app.exitCode}).\n${log}`);
    const ready = await fetch(`${base}/`).then((response) => response.ok, () => false);
    if (ready) break;
    if (Date.now() > deadline) throw new Error(`Reall did not start in time.\n${log}`);
    await new Promise((done) => setTimeout(done, 1_000));
  }

  const home_ = await fetch(`${base}/`);
  const cookie = (home_.headers.get("set-cookie") ?? "").split(";")[0];
  expect((await home_.text()).includes("Reall"), "home page renders");
  expect(cookie.startsWith("reall-session="), "the first page opens a local session");
  for (const path of ["/projects", "/projects/new", "/settings", "/dashboard"]) {
    const response = await fetch(`${base}${path}`, { headers: { cookie } });
    expect(response.status === 200, `${path} renders`);
  }
  const anonymous = await fetch(`${base}/api/connections`);
  expect(anonymous.status === 401, "the API refuses requests without the session");
  const connections = await fetch(`${base}/api/connections`, { headers: { cookie } });
  expect(connections.status === 200, "the API answers inside the session");
  const example = await fetch(`${base}/api/projects/example`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: base },
    body: "{}",
  });
  const exampleBody = await example.json();
  expect(
    example.status === 400 && /Save a model connection/.test(exampleBody.error ?? ""),
    "the example asks for a model connection first",
  );

  const second = spawn(process.execPath, [join(root, "apps", "worker", "dist", "index.js")], { cwd: root, env, stdio: "ignore" });
  const code = await new Promise((done) => {
    const timer = setTimeout(() => {
      second.kill("SIGTERM");
      done("still running");
    }, 20_000);
    second.once("exit", (exitCode) => {
      clearTimeout(timer);
      done(exitCode);
    });
  });
  expect(code === 3, `a second worker on the same state is refused (exit ${code})`);
} catch (cause) {
  failures.push(cause instanceof Error ? cause.message : String(cause));
  console.error(cause);
} finally {
  await stop();
}
if (failures.length > 0) {
  console.error(`\n${failures.length} smoke check(s) failed.`);
  process.exit(1);
}
console.log("\nSmoke test passed.");
