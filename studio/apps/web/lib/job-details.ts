import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  CHECKS_FILE,
  FINDINGS_FILE,
  parseChecks,
  parseFindings,
  type JobRecord,
  type StudioStore,
} from "@rea-studio/core";

/** The structured results of one run, read from its workspace and events. */
export async function jobDetails(store: StudioStore, job: JobRecord) {
  const read = (path: string) =>
    // Job files are runtime data and must not enter Next's deployment tracing.
    readFile(join(/* turbopackIgnore: true */ job.workspace, path), "utf8").catch(
      () => undefined,
    );
  const [checks, findings] = await Promise.all([read(CHECKS_FILE), read(FINDINGS_FILE)]);
  const parsed = findings === undefined ? undefined : parseFindings(findings);
  return {
    changes: store.jobChanges(job.id),
    checks: checks ? parseChecks(checks) : [],
    findings: parsed?.findings ?? [],
    findingsRejected: parsed?.rejected ?? 0,
    hasFindings: findings !== undefined,
    evidenceFiles: store.evidenceFiles(job.id),
  };
}

export type JobDetails = Awaited<ReturnType<typeof jobDetails>>;
