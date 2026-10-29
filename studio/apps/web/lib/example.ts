import { join } from "node:path";

import { forkRoot } from "@rea-studio/agent";

/** The guided first project shipped in studio/examples/notas. */
export const examplePath = (): string => join(forkRoot(), "studio", "examples", "notas");

export const exampleProject = (locale: "es" | "en") =>
  locale === "es"
    ? {
        name: "Ejemplo · App de notas",
        description:
          "Proyecto guiado: entender la búsqueda de una app de notas de ejemplo y reconstruirla con pruebas.",
      }
    : {
        name: "Example · Notes app",
        description:
          "Guided project: understand the search of a sample notes app and rebuild it with tests.",
      };
