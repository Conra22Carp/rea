import { existsSync } from "node:fs";

import { redirect } from "next/navigation";

import { JobWizard } from "@/components/JobWizard";
import { examplePath } from "@/lib/example";
import { getStore, workerHeartbeat } from "@/lib/server";

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; from?: string; example?: string }>;
}) {
  const { project: id, from, example } = await searchParams;
  const store = getStore();
  const project = id ? store.getProject(id) : undefined;
  if (!project) redirect("/projects/new");
  const heartbeat = workerHeartbeat();
  // "Run again" starts from a finished run's choices; secrets are never copied.
  const previous = from ? store.getJob(from) : undefined;
  const sample = example === "notas" ? examplePath() : undefined;
  return (
    <JobWizard
      project={project}
      models={store.listModels()}
      settings={store.getSettings()}
      workerAlive={Boolean(
        heartbeat && Date.now() - heartbeat.getTime() < 15000,
      )}
      {...(previous && previous.projectId === project.id ? { initialSpec: previous.spec } : {})}
      {...(sample && existsSync(sample) ? { examplePath: sample } : {})}
    />
  );
}
