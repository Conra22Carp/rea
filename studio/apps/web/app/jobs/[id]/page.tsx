import { notFound } from "next/navigation";
import { JobView } from "@/components/JobView";
import { jobDetails } from "@/lib/job-details";
import { getStore } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const job = store.getJob(id);
  if (!job) notFound();
  const previous = store
    .listJobs(-1)
    .find(
      (candidate) =>
        candidate.projectId === job.projectId &&
        candidate.createdAt < job.createdAt,
    );
  return (
    <JobView
      initial={job}
      initialApprovals={store.listApprovals(id)}
      initialDetails={await jobDetails(store, job)}
      previousId={previous?.id}
    />
  );
}
