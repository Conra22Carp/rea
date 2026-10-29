import { jobDetails } from "@/lib/job-details";
import { badRequest, errorText, getStore, guard, json, notFoundJson } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guard(request);
  if (refused) return refused;
  const { id } = await params;
  const store = getStore();
  const job = store.getJob(id);
  if (!job) return notFoundJson();
  return json({ job, approvals: store.listApprovals(id), details: await jobDetails(store, job) });
}

/** Remove a finished run from Reall's history; its files stay on disk. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guard(request);
  if (refused) return refused;
  const { id } = await params;
  try {
    const job = getStore().deleteJob(id);
    return json({ removed: job.id, workspace: job.workspace });
  } catch (cause) {
    return badRequest(errorText(cause, request));
  }
}
