"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { ProjectRecord } from "@rea-studio/core";
import { messageOf, post } from "@/lib/client";
import { useLocale } from "./Locale";
import { Button } from "./ui";

/** Create the guided example project and open its first run, prefilled. */
export function TryExample({ variant = "ghost" }: { variant?: "primary" | "ghost" }) {
  const { t } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="try-example">
      <Button
        variant={variant}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { project } = await post<{ project: ProjectRecord }>("/api/projects/example", {});
            router.push(`/jobs/new?project=${project.id}&example=notas`);
          } catch (cause) {
            setError(messageOf(cause));
            setBusy(false);
          }
        }}
      >
        <Lightbulb size={15} />
        {t("Probar con un ejemplo", "Try an example")}
      </Button>
      {error && (
        <small role="alert">
          {error}{" "}
          <Link href="/settings" className="text-link">
            {t("Ir a Configuración", "Open Settings")}
          </Link>
        </small>
      )}
    </span>
  );
}
