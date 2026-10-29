/**
 * Spanish text for the messages Reall's own backend produces. The English
 * text stays the stored and logged form; the UI translates when it shows it.
 */
const SPANISH: Readonly<Record<string, string>> = {
  // API requests
  "A base URL is required.": "Se necesita una URL base.",
  "An API key is required.": "Se necesita una API key.",
  "Unsupported provider.": "Proveedor no compatible.",
  "Choose a directory.": "Elegí una carpeta.",
  "Use an absolute directory.": "Usá una carpeta absoluta.",
  "Send approved: true or false.": "Enviá approved: true o false.",
  "This approval was already decided.": "Esta aprobación ya fue resuelta.",
  "The workspace is too large to zip.":
    "La carpeta de la ejecución es demasiado grande para el ZIP.",
  "Choose a regular file.": "Elegí un archivo común.",
  "Path is outside the job.": "La ruta está fuera de la ejecución.",
  "Choose a saved model for the job.":
    "Elegí un modelo guardado para la ejecución.",
  "Enter the password for the target login.":
    "Ingresá la contraseña del login del objetivo.",
  "Project not found.": "No se encontró el proyecto.",
  "Send the job as multipart form data.":
    "Enviá la ejecución como formulario multipart.",
  "The cookie export is empty.": "La exportación de cookies está vacía.",
  "The job field is not valid JSON.": "El campo job no es un JSON válido.",
  "The local path must be absolute and exist on this machine.":
    "La ruta local tiene que ser absoluta y existir en esta máquina.",
  "An OpenAI-compatible provider needs a base URL.":
    "Un proveedor compatible con OpenAI necesita una URL base.",
  "Choose a supported provider.": "Elegí un proveedor compatible.",
  "Connection not found.": "No se encontró la conexión.",
  "Enter a model id.": "Ingresá el ID del modelo.",
  "Choose a provider and a model, or a saved model.":
    "Elegí un proveedor y un modelo, o un modelo guardado.",
  "Model not found.": "No se encontró el modelo.",
  "Cross-origin requests are refused.":
    "Se rechazan las solicitudes desde otro origen.",
  "Cross-site requests are refused.":
    "Se rechazan las solicitudes desde otro sitio.",
  "Not found.": "No encontrado.",
  "This host is not allowed to reach Reall.":
    "Este host no tiene permitido acceder a Reall.",
  "Open Reall in this browser to start a local session.":
    "Abrí Reall en este navegador para iniciar una sesión local.",
  "Only finished runs can be removed.":
    "Solo se pueden quitar ejecuciones terminadas.",
  "Run not found.": "No se encontró la ejecución.",
  "Finish or cancel this project's active runs first.":
    "Primero terminá o cancelá las ejecuciones activas del proyecto.",
  "Save a model connection before trying the example.":
    "Guardá una conexión de modelo antes de probar el ejemplo.",
  "The example project is not available in this installation.":
    "El proyecto de ejemplo no está disponible en esta instalación.",
  // Store
  "Remove the saved models using this connection first.":
    "Primero quitá los modelos guardados que usan esta conexión.",
  "Choose an available saved model.": "Elegí un modelo guardado disponible.",
  "Choose an absolute folder on this machine.":
    "Elegí una carpeta absoluta en esta máquina.",
  "This model is used by a project or an active job.":
    "Este modelo lo usa un proyecto o una ejecución activa.",
  "Create a new connection to change its provider or endpoint.":
    "Creá una conexión nueva para cambiar el proveedor o el endpoint.",
  // Runs
  "Worker stopped before the job finished.":
    "El worker se detuvo antes de que terminara la ejecución.",
  "The job reached its estimated cost budget.":
    "La ejecución alcanzó su presupuesto de costo estimado.",
  "The job would exceed its estimated cost budget.":
    "La ejecución superaría su presupuesto de costo estimado.",
  "The job exceeded its token budget.":
    "La ejecución superó su presupuesto de tokens.",
  "Cancelled by the user.": "Cancelada por el usuario.",
  "Job cancelled.": "Ejecución cancelada.",
  "The specification was rejected.": "Se rechazó la especificación.",
  "The selected model configuration no longer exists.":
    "La configuración del modelo elegido ya no existe.",
  "Worker shutting down.": "El worker se está deteniendo.",
  "No browser was found for this web target.":
    "No se encontró un navegador para este objetivo web.",
};

/** Prefixes whose remainder is external text (a provider error, a path). */
const SPANISH_PREFIXES: readonly (readonly [string, string])[] = [
  ["Connection failed: ", "La conexión falló: "],
];

export type MessageLocale = "es" | "en";

/** Show a backend message in the interface language; unknown text passes through. */
export const translateMessage = (
  message: string,
  locale: MessageLocale,
): string => {
  if (locale === "en") return message;
  const exact = SPANISH[message.trim()];
  if (exact) return exact;
  for (const [prefix, spanish] of SPANISH_PREFIXES) {
    if (message.startsWith(prefix))
      return `${spanish}${message.slice(prefix.length)}`;
  }
  return message;
};
