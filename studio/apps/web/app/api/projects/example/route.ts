import { existsSync } from "node:fs";

import { examplePath, exampleProject } from "@/lib/example";
import { badRequest, errorText, getStore, guard, json, requestLocale } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Create the guided example project with the default (or first) saved model. */
export async function POST(request: Request) {
  const refused = guard(request);
  if (refused) return refused;
  const store = getStore();
  const settings = store.getSettings();
  const models = store.listModels();
  const model = models.find((item) => item.id === settings.defaultModelId) ?? models[0];
  if (!model) return badRequest("Save a model connection before trying the example.");
  if (!existsSync(examplePath())) {
    return badRequest("The example project is not available in this installation.");
  }
  try {
    const project = store.createProject({
      ...exampleProject(requestLocale(request)),
      modelId: model.id,
      outputDirectory: settings.defaultOutputDirectory,
    });
    return json({ project }, 201);
  } catch (cause) {
    return badRequest(errorText(cause, request));
  }
}
