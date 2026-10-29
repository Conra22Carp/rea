#!/usr/bin/env node
// Install Reall from a fresh clone with one command:
//   cd studio && npm run setup
// It installs and builds the REA engine at the repository root, then Studio.
//   --studio-only   skip the engine (use a REA you already installed)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const studio = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(studio, "..");
const studioOnly = process.argv.includes("--studio-only");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const say = (message) => console.log(`[setup] ${message}`);
const fail = (message) => {
  console.error(`[setup] ${message}`);
  process.exit(1);
};

// The pinned toolchain lives in .nvmrc and package.json#packageManager.
const wantedNode = existsSync(join(repo, ".nvmrc"))
  ? readFileSync(join(repo, ".nvmrc"), "utf8").trim().replace(/^v/, "")
  : "";
const wantedNpm = (() => {
  try {
    const manager = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).packageManager;
    return typeof manager === "string" && manager.startsWith("npm@") ? manager.slice(4) : "";
  } catch {
    return "";
  }
})();
const [major] = process.versions.node.split(".").map(Number);
if (major !== undefined && major < 22) {
  fail(`Node ${process.versions.node} is too old. Install Node ${wantedNode || "24"} (see .nvmrc) and run this again.`);
}
if (wantedNode && process.versions.node !== wantedNode) {
  say(`Node ${process.versions.node} is running; the tested version is ${wantedNode} (.nvmrc). Continuing.`);
}
const npmVersion = spawnSync(npm, ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).stdout?.trim();
if (wantedNpm && npmVersion && npmVersion !== wantedNpm) {
  say(`npm ${npmVersion} is running; the tested version is ${wantedNpm}. Continuing.`);
}

const steps = [
  ...(studioOnly
    ? []
    : [
        ["Installing the REA engine", repo, ["ci"]],
        ["Building the REA engine", repo, ["run", "build:cached"]],
      ]),
  ["Installing Studio", studio, ["ci"]],
  ["Building Studio", studio, ["run", "build"]],
];

const started = Date.now();
for (const [label, cwd, args] of steps) {
  say(`${label}… (npm ${args.join(" ")})`);
  const result = spawnSync(npm, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, HUSKY: "0", NEXT_TELEMETRY_DISABLED: "1" },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) fail(`${label} failed (exit ${result.status ?? "signal"}). Fix the error above and run npm run setup again.`);
}
say(`Done in ${Math.round((Date.now() - started) / 1000)} s. Start Reall with: npm run studio`);
say("Then open http://127.0.0.1:4317 on this computer and keep the terminal open.");
