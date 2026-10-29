import { translateMessage } from "@rea-studio/core/messages";

/** Backend errors arrive in English; show them in the interface language. */
const localize = (message: string): string =>
  translateMessage(
    message,
    typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "es",
  );

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(localize(result.error || `HTTP ${response.status}`));
  return result as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
/** The message of a thrown error, without the "Error:" prefix of String(). */
export const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : localize(String(cause));
