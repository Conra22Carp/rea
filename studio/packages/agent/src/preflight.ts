import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";

import type { AccessMode, TargetKind } from "@rea-studio/core";

import { detectBrowserExecutable } from "./browser.js";
import { resolveReaLaunch } from "./rea.js";

export type PreflightStatus = "ok" | "warn" | "fail";

/** Stable ids; the interface owns their wording in each language. */
export type PreflightId =
  | "node"
  | "rea"
  | "browser"
  | "java"
  | "jadx"
  | "native-provider";

export interface PreflightCheck {
  readonly id: PreflightId;
  readonly status: PreflightStatus;
  /** Neutral facts: a version, a path, a command. */
  readonly detail?: string;
}

/** The engine ranges declared in studio/package.json. */
const NODE_RANGES: readonly (readonly [number, number, number, boolean])[] = [
  [22, 23, 4, false],
  [24, 22, 1, false],
  [26, 12, 1, true],
];

export const nodeSupported = (version: string): boolean => {
  const [major = 0, minor = 0, patch = 0] = version
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  return NODE_RANGES.some(([m, n, p, orNewer]) => {
    if (orNewer ? major < m : major !== m) return false;
    if (major > m) return true;
    return minor > n || (minor === n && patch >= p);
  });
};

const commandWorks = (command: string, args: readonly string[]): boolean => {
  const result = spawnSync(command, args, { timeout: 5_000, stdio: "ignore" });
  return result.status === 0;
};

/**
 * What a run of this kind needs on this machine, checked before any model
 * call. Checks that cannot be confirmed locally say so as a warning.
 */
export const runPreflight = (input: {
  readonly kind: TargetKind;
  readonly accessMode?: AccessMode;
  readonly env?: NodeJS.ProcessEnv;
  readonly nodeVersion?: string;
}): PreflightCheck[] => {
  const env = input.env ?? process.env;
  const version = input.nodeVersion ?? process.versions.node;
  const checks: PreflightCheck[] = [
    { id: "node", status: nodeSupported(version) ? "ok" : "fail", detail: `v${version.replace(/^v/, "")}` },
  ];
  const launch = resolveReaLaunch(env);
  checks.push({
    id: "rea",
    // npx downloads the pinned release on first use: it works, but needs network.
    status: launch.source === "npx" ? "warn" : "ok",
    detail: `${launch.source}: ${[launch.command, ...launch.args].join(" ")}`,
  });
  if (input.kind === "web" && input.accessMode !== "connect") {
    const browser = detectBrowserExecutable(env);
    checks.push({ id: "browser", status: browser ? "ok" : "fail", ...(browser ? { detail: browser } : {}) });
  }
  if (input.kind === "android") {
    checks.push({ id: "java", status: commandWorks("java", ["-version"]) ? "ok" : "fail" });
    const jar = env.REA_JADX_MCP_JAR;
    checks.push({
      id: "jadx",
      status: jar && isAbsolute(jar) && existsSync(jar) ? "ok" : "fail",
      ...(jar ? { detail: jar } : {}),
    });
  }
  if (input.kind === "native") {
    // Ghidra, Hopper and IDA are configured through REA; only Ghidra's variable is visible here.
    checks.push({
      id: "native-provider",
      status: env.GHIDRA_INSTALL_DIR && existsSync(env.GHIDRA_INSTALL_DIR) ? "ok" : "warn",
      ...(env.GHIDRA_INSTALL_DIR ? { detail: env.GHIDRA_INSTALL_DIR } : {}),
    });
  }
  return checks;
};
