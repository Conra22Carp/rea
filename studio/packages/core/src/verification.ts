import { z } from "zod";

import type {
  Finding,
  VerificationCheck,
  VerificationSummary,
} from "./types.js";

/** Written by Reall itself under logs/, which the model cannot write to. */
export const CHECKS_FILE = "logs/checks.json";
/** Written by the report phase: claims and the evidence behind them. */
export const FINDINGS_FILE = "output/findings.json";

/** A run is verified only when Reall recorded checks and none of them failed. */
export const summarizeChecks = (
  checks: readonly VerificationCheck[],
): VerificationSummary => {
  // A check run again (after a fix) replaces its earlier result.
  const latest = [...new Map(checks.map((check) => [check.name, check])).values()];
  const passed = latest.filter((check) => check.passed).length;
  const failed = latest.length - passed;
  return {
    status:
      latest.length === 0 ? "unverified" : failed > 0 ? "failed" : "verified",
    passed,
    failed,
    total: latest.length,
  };
};

const checkSchema = z.object({
  name: z.string(),
  command: z.string(),
  cwd: z.string(),
  exitCode: z.number().int().nullable(),
  passed: z.boolean(),
  timedOut: z.boolean(),
  durationMs: z.number().nonnegative(),
  outputTail: z.string(),
  finishedAt: z.string(),
});

/** Parse the checks log; anything unreadable counts as no checks. */
export const parseChecks = (source: string): VerificationCheck[] => {
  try {
    const parsed = z.array(checkSchema).safeParse(JSON.parse(source));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
};

const findingSchema = z.object({
  claim: z.string().trim().min(1).max(2_000),
  kind: z.enum(["observed", "inferred", "unknown"]),
  evidence: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  check: z.string().trim().min(1).max(200).optional(),
});

/**
 * Parse output/findings.json written by the report phase. Malformed entries
 * are dropped and counted so the UI can say the list is incomplete.
 */
export const parseFindings = (
  source: string,
): { findings: Finding[]; rejected: number } => {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return { findings: [], rejected: 1 };
  }
  const items = Array.isArray(raw) ? raw : [];
  const findings: Finding[] = [];
  let rejected = Array.isArray(raw) ? 0 : 1;
  for (const item of items) {
    const parsed = findingSchema.safeParse(item);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }
    const { check, ...rest } = parsed.data;
    findings.push({ ...rest, ...(check ? { check } : {}) });
  }
  return { findings, rejected };
};
