import { badRequest, errorText, getStore, guard, json } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Remove a project and its finished runs from Reall; its folder stays on disk. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guard(request);
  if (refused) return refused;
  const { id } = await params;
  try {
    const project = getStore().deleteProject(id);
    return json({ removed: project.id, outputDirectory: project.outputDirectory });
  } catch (cause) {
    return badRequest(errorText(cause, request));
  }
}
