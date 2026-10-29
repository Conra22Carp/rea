import { accessSync, constants } from "node:fs";

import { runPreflight } from "@rea-studio/agent";
import {
  ACCESS_MODES,
  HEARTBEAT_FRESH_MS,
  heartbeatAge,
  studioHome,
  TARGET_KINDS,
  type AccessMode,
  type TargetKind,
} from "@rea-studio/core";

import { getStore, guard, json, notFoundJson } from "@/lib/server";

export const dynamic = "force-dynamic";

/** What a run needs before it spends tokens: tools, worker, folder and model. */
export async function GET(request: Request) {
  const refused = guard(request);
  if (refused) return refused;
  const query = new URL(request.url).searchParams;
  const store = getStore();
  const project = store.getProject(query.get("project") ?? "");
  if (!project) return notFoundJson();
  const kind = (TARGET_KINDS.find((item) => item.id === query.get("kind"))?.id ?? "web") as TargetKind;
  const access = (ACCESS_MODES.find((item) => item.id === query.get("access"))?.id ?? "none") as AccessMode;
  const checks: { id: string; status: "ok" | "warn" | "fail"; detail?: string }[] = [
    ...runPreflight({ kind, accessMode: access }),
  ];
  const age = heartbeatAge(studioHome());
  checks.push({ id: "worker", status: age !== undefined && age < HEARTBEAT_FRESH_MS ? "ok" : "fail" });
  let writable = true;
  try {
    accessSync(project.outputDirectory, constants.W_OK);
  } catch {
    writable = false;
  }
  checks.push({ id: "folder", status: writable ? "ok" : "fail", detail: project.outputDirectory });
  const model = store.getModel(project.modelId);
  const keyless = model && (model.provider === "ollama" || Boolean(model.baseURL));
  checks.push({
    id: "model",
    status: model && (model.hasApiKey || keyless) ? "ok" : "fail",
    ...(model ? { detail: `${model.name} · ${model.model}` } : {}),
  });
  return json({ checks, ready: checks.every((check) => check.status !== "fail") });
}
