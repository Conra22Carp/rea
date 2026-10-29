"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { diffLines } from "diff";
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  Bell,
  BellOff,
  Check,
  Circle,
  Clock3,
  Code2,
  Download,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitCompareArrows,
  Lightbulb,
  ListChecks,
  Radio,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import type {
  ApprovalRecord,
  Finding,
  FindingKind,
  JobRecord,
  StoredEvent,
  PhaseId,
} from "@rea-studio/core";
import { translateMessage } from "@rea-studio/core/messages";
import type { JobDetails } from "@/lib/job-details";
import { api, post, messageOf } from "@/lib/client";
import { dollars, number, useLocale } from "./Locale";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageTitle,
  PriceAge,
  StatusPill,
  Tag,
  Textarea,
  VerificationBadge,
  buttonClass,
} from "./ui";
import { Markdown } from "./Markdown";
interface FileResult {
  type: "dir" | "file";
  path: string;
  entries?: { name: string; path: string; dir: boolean }[];
  content?: string;
  binary?: boolean;
  truncated?: boolean;
  size?: number;
}
const terminal = (job: JobRecord) =>
  ["succeeded", "failed", "cancelled"].includes(job.status);
const NOTIFY_KEY = "reall-notify";
export function JobView({
  initial,
  initialApprovals,
  initialDetails,
  previousId,
}: {
  initial: JobRecord;
  initialApprovals: ApprovalRecord[];
  initialDetails: JobDetails;
  previousId?: string;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [details, setDetails] = useState(initialDetails);
  const [notify, setNotify] = useState(false);
  const lastStatus = useRef(initial.status);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const newestEvents = events.slice().reverse();
  const [approvals, setApprovals] = useState(initialApprovals);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState("activity");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [file, setFile] = useState<FileResult>();
  const [folder, setFolder] = useState<FileResult>();
  const [report, setReport] = useState("");
  const [diff, setDiff] = useState<ReturnType<typeof diffLines>>();
  const lastSeq = useRef(0);
  const [phaseState, setPhaseState] = useState<
    Partial<Record<PhaseId, string>>
  >({});
  const phases = [
    ["analysis", t("Análisis", "Analysis")],
    ["spec", t("Especificación", "Specification")],
    ["build", t("Construcción", "Build")],
    ["verify", t("Verificación", "Verification")],
    ["report", t("Informe", "Report")],
  ] as const;
  async function refresh() {
    const result = await api<{
      job: JobRecord;
      approvals: ApprovalRecord[];
      details: JobDetails;
    }>(`/api/jobs/${initial.id}`);
    setJob(result.job);
    setApprovals(result.approvals);
    setDetails(result.details);
  }
  // Notifications are opt-in per browser; the choice is a local convenience.
  useEffect(() => {
    try {
      setNotify(
        localStorage.getItem(NOTIFY_KEY) === "1" &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted",
      );
    } catch {
      setNotify(false);
    }
  }, []);
  // The tab title says when a run needs the user or has finished.
  useEffect(() => {
    const needsReview = job.status === "waiting_approval";
    const prefix = needsReview
      ? t("● Requiere revisión", "● Needs review")
      : terminal(job)
        ? t("✓ Terminado", "✓ Finished")
        : t("En ejecución", "Running");
    document.title = `${prefix} · ${job.title} · Reall`;
    const changed = lastStatus.current !== job.status;
    lastStatus.current = job.status;
    if (changed && notify && (needsReview || terminal(job))) {
      try {
        new Notification(`Reall · ${job.title}`, {
          body: needsReview
            ? t("La ejecución espera tu revisión.", "The run is waiting for your review.")
            : t("La ejecución terminó.", "The run has finished."),
        });
      } catch {
        // Notifications unavailable in this context.
      }
    }
  }, [job, notify, t]);
  async function toggleNotify() {
    if (notify) {
      setNotify(false);
      try {
        localStorage.setItem(NOTIFY_KEY, "0");
      } catch {
        // Private mode: the choice lasts for this page only.
      }
      return;
    }
    if (typeof Notification === "undefined") {
      setError(t("Este navegador no admite notificaciones.", "This browser does not support notifications."));
      return;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotify(granted);
    if (!granted)
      setError(t("El navegador no permitió notificaciones.", "The browser did not allow notifications."));
    try {
      localStorage.setItem(NOTIFY_KEY, granted ? "1" : "0");
    } catch {
      // Private mode: the choice lasts for this page only.
    }
  }
  async function removeFromHistory() {
    if (
      !confirm(
        t(
          `¿Quitar esta ejecución del historial de Reall? Sus archivos quedan en ${job.workspace}.`,
          `Remove this run from Reall's history? Its files stay in ${job.workspace}.`,
        ),
      )
    )
      return;
    setBusy("remove");
    setError("");
    try {
      await api(`/api/jobs/${job.id}`, { method: "DELETE" });
      router.push(job.projectId ? `/projects/${job.projectId}` : "/projects");
      router.refresh();
    } catch (cause) {
      setError(messageOf(cause));
      setBusy("");
    }
  }
  useEffect(() => {
    const source = new EventSource(
      `/api/jobs/${initial.id}/events?after=${lastSeq.current}`,
    );
    source.onopen = () => setConnected(true);
    source.addEventListener("job", (event) => {
      const stored = JSON.parse((event as MessageEvent).data) as StoredEvent;
      if (stored.seq <= lastSeq.current) return;
      lastSeq.current = stored.seq;
      setEvents((old) => [...old, stored].slice(-500));
      const eventData = stored.event;
      if (eventData.type === "phase")
        setPhaseState((old) => ({
          ...old,
          [eventData.phase]: eventData.status,
        }));
      if (stored.event.type === "approval")
        void refresh().catch((cause) => setError(messageOf(cause)));
    });
    source.addEventListener("status", () => {
      void refresh().catch((cause) => setError(messageOf(cause)));
    });
    source.addEventListener("end", () => {
      setConnected(false);
      source.close();
      void refresh().catch((cause) => setError(messageOf(cause)));
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, [initial.id]);
  async function browse(path: string) {
    setBusy("files");
    setError("");
    setDiff(undefined);
    try {
      const result = await api<FileResult>(
        `/api/jobs/${job.id}/files?path=${encodeURIComponent(path)}`,
      );
      if (result.type === "dir") {
        setFolder(result);
        setFile(undefined);
      } else setFile(result);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy("");
    }
  }
  async function selectTab(next: string) {
    setTab(next);
    setError("");
    if (next === "files") void browse(".");
    if (next === "report") {
      setBusy("report");
      try {
        const result = await api<FileResult>(
          `/api/jobs/${job.id}/files?path=output/REPORT.md`,
        );
        setReport(result.content ?? "");
      } catch {
        setReport("");
      } finally {
        setBusy("");
      }
    }
  }
  async function decide(approval: ApprovalRecord, approved: boolean) {
    setBusy(approval.id);
    setError("");
    try {
      await post(`/api/jobs/${job.id}/approvals/${approval.id}`, {
        approved,
        note: notes[approval.id] ?? "",
      });
      await refresh();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <Link
        href={job.projectId ? `/projects/${job.projectId}` : "/projects"}
        className="back-link"
      >
        <ArrowLeft size={14} />
        {t("Volver al proyecto", "Back to project")}
      </Link>
      <PageTitle
        title={job.title}
        actions={
          <>
            <StatusPill status={job.status} />
            {terminal(job) && job.verification && (
              <VerificationBadge verification={job.verification} />
            )}
            {terminal(job) && job.projectId && (
              <Link
                href={`/jobs/new?project=${job.projectId}&from=${job.id}`}
                className={buttonClass("ghost")}
              >
                <Repeat2 size={14} />
                {t("Repetir", "Run again")}
              </Link>
            )}
            {terminal(job) && (
              <Button
                variant="ghost"
                busy={busy === "remove"}
                onClick={() => void removeFromHistory()}
                aria-label={t("Quitar del historial", "Remove from history")}
                title={t("Quitar del historial", "Remove from history")}
              >
                <Trash2 size={14} />
              </Button>
            )}
            {!terminal(job) && (
              <Button
                variant="ghost"
                busy={busy === "cancel"}
                onClick={async () => {
                  if (
                    !confirm(
                      t(
                        "¿Cancelar esta ejecución? Se conservarán los archivos ya generados.",
                        "Cancel this run? Generated files will be kept.",
                      ),
                    )
                  )
                    return;
                  setBusy("cancel");
                  try {
                    await post(`/api/jobs/${job.id}/cancel`, {});
                    await refresh();
                  } catch (cause) {
                    setError(messageOf(cause));
                  } finally {
                    setBusy("");
                  }
                }}
              >
                <Square size={13} />
                {t("Cancelar", "Cancel")}
              </Button>
            )}
            <a
              href={`/api/jobs/${job.id}/download`}
              className={buttonClass("primary")}
            >
              <Download size={15} />
              {t("Descargar ZIP", "Download ZIP")}
            </a>
          </>
        }
      >
        {t(
          "Seguí el trabajo, revisá decisiones y explorá el código generado.",
          "Follow the work, review decisions, and explore generated code.",
        )}
      </PageTitle>
      <div className="run-policy" aria-label={t("Permisos de esta ejecución", "Permissions for this run")}>
        <ShieldCheck size={14} />
        <Tag>
          {job.spec.approvals.commands === "auto"
            ? t("Autorización completa", "Full authorization")
            : t("Aprobación paso por paso", "Step-by-step approval")}
        </Tag>
        <Tag>
          {job.spec.approvals.specReview
            ? t("Con revisión de especificación", "Specification review on")
            : t("Sin revisión de especificación", "No specification review")}
        </Tag>
        <span className="run-policy-note">
          {job.spec.approvals.commands === "auto"
            ? t(
                "Comandos y herramientas corren sin pedir aprobación, con los permisos de tu usuario.",
                "Commands and tools run without asking, with your user's permissions.",
              )
            : t(
                "Reall pide aprobación antes de cada comando y herramienta destructiva.",
                "Reall asks before every command and destructive tool.",
              )}
        </span>
      </div>
      <ErrorNotice message={error || (job.error ? translateMessage(job.error, locale) : undefined)} />
      <div className="run-metrics">
        <div>
          <span>{t("Entrada", "Input")}</span>
          <strong>{number(job.usage.inputTokens, locale)}</strong>
        </div>
        <div>
          <span>{t("Salida", "Output")}</span>
          <strong>{number(job.usage.outputTokens, locale)}</strong>
        </div>
        <div>
          <span>{t("Costo estimado", "Estimated cost")}</span>
          <strong>
            {job.usage.estimatedCostUsd !== undefined &&
            (job.usage.unpricedTokens ?? 0) < job.usage.totalTokens
              ? dollars(job.usage.estimatedCostUsd, locale)
              : "—"}
          </strong>
          {Boolean(job.usage.unpricedTokens) && (
            <small>
              {t("Incluye tokens sin tarifa", "Includes unpriced tokens")}
            </small>
          )}
          {job.pricing?.build && <PriceAge pricing={job.pricing.build} />}
        </div>
        <div>
          <span>{t("Presupuesto de tokens", "Token budget")}</span>
          <strong>
            {number(job.usage.totalTokens, locale)}{" "}
            <small>
              /{" "}
              {job.spec.budget.maxTotalTokens
                ? number(job.spec.budget.maxTotalTokens, locale)
                : "∞"}
            </small>
          </strong>
          {job.spec.budget.maxTotalTokens && (
            <progress
              value={job.usage.totalTokens}
              max={job.spec.budget.maxTotalTokens}
            />
          )}
        </div>
      </div>
      <div className="run-phases">
        {phases.map(([id, label], index) => {
          const done = phaseState[id] === "finished";
          const active = !terminal(job) && phaseState[id] === "started";
          return (
            <div
              key={id}
              className={done ? "complete" : active ? "current" : ""}
            >
              <span>{done ? <Check size={14} /> : index + 1}</span>
              {label}
            </div>
          );
        })}
      </div>
      {(details.checks.length > 0 || terminal(job)) && (
        <Card className="verification-card">
          <div className="section-heading">
            <div>
              <h2>{t("Verificación", "Verification")}</h2>
              <p className="field-hint">
                {t(
                  "Solo cuentan los checks que Reall ejecutó y registró con su código de salida; no lo que diga el informe.",
                  "Only checks Reall ran and recorded with their exit code count; not what the report says.",
                )}
              </p>
            </div>
            {job.verification && <VerificationBadge verification={job.verification} />}
          </div>
          {details.checks.length === 0 ? (
            <p className="verification-empty">
              {t(
                "Esta ejecución no registró checks: el resultado no está verificado.",
                "This run recorded no checks: the result is not verified.",
              )}
            </p>
          ) : (
            <ul className="check-list">
              {details.checks.map((check, index) => (
                <li key={`${check.name}-${index}`} className={check.passed ? "passed" : "failed"}>
                  <span className="check-mark">
                    {check.passed ? <Check size={13} /> : <Square size={11} />}
                  </span>
                  <div>
                    <strong>{check.name}</strong>
                    <code>{check.command}</code>
                    <small>
                      {check.passed ? t("Pasó", "Passed") : t("Falló", "Failed")} ·{" "}
                      {t("código", "exit code")} {check.exitCode ?? "—"}
                      {check.timedOut ? ` · ${t("tiempo agotado", "timed out")}` : ""} ·{" "}
                      {(check.durationMs / 1000).toFixed(1)} s
                    </small>
                    {check.outputTail && (
                      <details>
                        <summary>{t("Ver salida", "View output")}</summary>
                        <pre>{check.outputTail}</pre>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {terminal(job) && (
        <Card className="changes-card">
          <div className="section-heading">
            <div>
              <h2>{t("Qué cambió", "What changed")}</h2>
              <p className="field-hint">
                {t(
                  `${details.changes.files.length} archivos escritos o editados · ${details.changes.commands.length} comandos ejecutados`,
                  `${details.changes.files.length} files written or edited · ${details.changes.commands.length} commands run`,
                )}
              </p>
            </div>
            <ListChecks size={22} />
          </div>
          <div className="changes-grid">
            <div>
              <h3>{t("Archivos", "Files")}</h3>
              {details.changes.files.length === 0 ? (
                <p className="field-hint">{t("Ninguno.", "None.")}</p>
              ) : (
                <ul>
                  {details.changes.files.slice(0, 40).map((entry) => (
                    <li key={entry.path}>
                      <button
                        className="text-link"
                        onClick={() => {
                          setTab("files");
                          void browse(entry.path);
                        }}
                      >
                        {entry.path}
                      </button>
                      <small>{entry.action === "edit" ? t("editado", "edited") : t("escrito", "written")}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>{t("Comandos", "Commands")}</h3>
              {details.changes.commands.length === 0 ? (
                <p className="field-hint">{t("Ninguno.", "None.")}</p>
              ) : (
                <ul>
                  {details.changes.commands.slice(0, 40).map((command, index) => (
                    <li key={index}>
                      <code>{command}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}
      {approvals
        .filter((approval) => approval.status === "pending")
        .map((approval) => (
          <Card key={approval.id} className="approval-card">
            <div className="section-heading">
              <div>
                <h2>
                  {approval.kind === "spec"
                    ? t("Revisá la especificación", "Review the specification")
                    : approval.kind === "command"
                      ? t("Aprobar comando", "Approve command")
                      : t("Aprobar herramienta", "Approve tool")}
                </h2>
              </div>
              <ShieldCheck size={24} />
            </div>
            <details open={approval.kind === "spec"}>
              <summary>{approval.title}</summary>
              <div className="approval-detail">
                <Markdown source={approval.detail} />
              </div>
            </details>
            <label className="field">
              <span>
                {t(
                  "Comentarios o cambios solicitados",
                  "Feedback or requested changes",
                )}
              </span>
              <Textarea
                value={notes[approval.id] ?? ""}
                maxLength={4000}
                onChange={(event) =>
                  setNotes({ ...notes, [approval.id]: event.target.value })
                }
                placeholder={t(
                  "Indicá los cambios antes de continuar…",
                  "Describe changes before continuing…",
                )}
              />
            </label>
            <div className="form-actions">
              <Button
                variant="ghost"
                busy={busy === approval.id}
                onClick={() => void decide(approval, false)}
              >
                {approval.kind === "spec" && notes[approval.id]
                  ? t("Solicitar cambios", "Request changes")
                  : t("Rechazar", "Reject")}
              </Button>
              <Button
                busy={busy === approval.id}
                onClick={() => void decide(approval, true)}
              >
                <Check size={16} />
                {t("Aprobar y continuar", "Approve and continue")}
              </Button>
            </div>
          </Card>
        ))}
      <div className="tabs">
        <button
          aria-pressed={tab === "activity"}
          onClick={() => void selectTab("activity")}
        >
          <Activity size={16} />
          {t("Actividad", "Activity")}
        </button>
        <button
          aria-pressed={tab === "files"}
          onClick={() => void selectTab("files")}
        >
          <FolderOpen size={16} />
          {t("Archivos", "Files")}
        </button>
        <button
          aria-pressed={tab === "report"}
          onClick={() => void selectTab("report")}
        >
          <FileText size={16} />
          {t("Informe", "Report")}
        </button>
        <button
          aria-pressed={tab === "learned"}
          onClick={() => void selectTab("learned")}
        >
          <Lightbulb size={16} />
          {t("Qué aprendimos", "What we learned")}
        </button>
        <button
          className="notify-toggle"
          aria-pressed={notify}
          onClick={() => void toggleNotify()}
          title={t(
            "Avisarme cuando pida revisión o termine",
            "Notify me when it needs review or finishes",
          )}
        >
          {notify ? <Bell size={15} /> : <BellOff size={15} />}
          {notify ? t("Avisos activados", "Alerts on") : t("Avisarme", "Notify me")}
        </button>
        <span className={`live-indicator ${connected ? "connected" : ""}`}>
          <Radio size={13} />
          {terminal(job)
            ? t("Finalizado", "Finished")
            : connected
              ? t("En vivo", "Live")
              : t("Reconectando…", "Reconnecting…")}
        </span>
      </div>
      {tab === "activity" && (
        <Card>
          {events.length === 0 ? (
            <EmptyState
              icon={<Clock3 size={27} />}
              title={t("Esperando actividad", "Waiting for activity")}
            >
              {t(
                "Los eventos aparecerán cuando el worker empiece la ejecución.",
                "Events will appear when the worker starts this run.",
              )}
            </EmptyState>
          ) : (
            <div className="timeline">
              {newestEvents.map(({ seq, ts, event }) => (
                <div key={seq} className={`timeline-item event-${event.type}`}>
                  <span className="timeline-dot">
                    {event.type === "tool-call" ? (
                      <Terminal size={13} />
                    ) : event.type === "file" ? (
                      <FileCode2 size={13} />
                    ) : event.type === "usage" ? (
                      <Activity size={13} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  <div>
                    <div className="timeline-heading">
                      <strong>
                        {event.type === "phase"
                          ? `${phases.find(([id]) => id === event.phase)?.[1]} · ${event.status === "finished" ? t("completada", "completed") : event.status === "failed" ? t("falló", "failed") : t("iniciada", "started")}`
                          : event.type === "tool-call" ||
                              event.type === "tool-result"
                            ? event.tool
                            : event.type === "usage"
                              ? t("Consumo actualizado", "Usage updated")
                              : event.type === "file"
                                ? event.path
                                : event.type === "check"
                                  ? `${t("Check", "Check")}: ${event.check.name}`
                                : event.type === "done"
                                  ? t("Ejecución finalizada", "Run finished")
                                  : event.type === "approval"
                                    ? t("Aprobación", "Approval")
                                    : event.type === "text"
                                      ? t(
                                          "Respuesta del modelo",
                                          "Model response",
                                        )
                                      : t("Sistema", "System")}
                      </strong>
                      <time>{new Date(ts).toLocaleTimeString(locale)}</time>
                    </div>
                    {event.type === "text" ? (
                      <Markdown source={event.text} />
                    ) : event.type === "log" ? (
                      <p>{event.message}</p>
                    ) : event.type === "usage" ? (
                      <p>
                        {number(event.inputTokens, locale)}{" "}
                        {t("entrada", "input")} ·{" "}
                        {number(event.outputTokens, locale)}{" "}
                        {t("salida", "output")}
                        {event.estimatedCostUsd !== undefined &&
                          ` · ${dollars(event.estimatedCostUsd, locale)}`}{" "}
                        {event.model && <code>{event.model}</code>}
                      </p>
                    ) : event.type === "tool-call" ? (
                      <details>
                        <summary>
                          {t("Ver argumentos", "View arguments")}
                        </summary>
                        <pre>{event.input}</pre>
                      </details>
                    ) : event.type === "tool-result" ? (
                      <details>
                        <summary>
                          {event.ok
                            ? t("Resultado recibido", "Result received")
                            : t(
                                "La herramienta informó un error",
                                "Tool reported an error",
                              )}
                          {event.evidenceIds?.length
                            ? ` · ${event.evidenceIds.join(", ")}`
                            : ""}
                        </summary>
                        <pre>{event.preview}</pre>
                        {event.savedTo && (
                          <button
                            className="text-link"
                            onClick={() => {
                              setTab("files");
                              void browse(event.savedTo!);
                            }}
                          >
                            {event.savedTo}
                          </button>
                        )}
                      </details>
                    ) : event.type === "phase" && event.summary ? (
                      <p>{translateMessage(event.summary, locale)}</p>
                    ) : event.type === "check" ? (
                      <p>
                        {event.check.passed ? t("Pasó", "Passed") : t("Falló", "Failed")} ·{" "}
                        <code>{event.check.command}</code>
                      </p>
                    ) : event.type === "done" && event.error ? (
                      <p>{translateMessage(event.error, locale)}</p>
                    ) : event.type === "approval" ? (
                      <p>{event.title}</p>
                    ) : null}
                  </div>
                </div>
              ))}
              {events.length >= 500 && (
                <p className="field-hint">
                  {t(
                    "Mostrando los últimos 500 eventos. El historial completo se conserva localmente.",
                    "Showing the last 500 events. Full history is retained locally.",
                  )}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
      {tab === "files" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>{t("Explorador de archivos", "File explorer")}</h2>
              <code className="file-location">{job.workspace}/output</code>
            </div>
            <Button
              variant="ghost"
              busy={busy === "files"}
              onClick={() => void browse(folder?.path ?? ".")}
            >
              <RefreshCw size={14} />
              {t("Actualizar", "Refresh")}
            </Button>
          </div>
          <div className="file-browser">
            <nav aria-label={t("Archivos generados", "Generated files")}>
              <button
                onClick={() =>
                  void browse(
                    (folder?.path ?? ".").split("/").slice(0, -1).join("/") ||
                      ".",
                  )
                }
              >
                <ArrowUp size={15} />
                {t("Subir", "Up")}
              </button>
              {folder?.entries?.map((entry) => (
                <button
                  className={entry.path === file?.path ? "selected" : ""}
                  key={entry.path}
                  onClick={() => void browse(entry.path)}
                >
                  {entry.dir ? <Folder size={15} /> : <FileCode2 size={15} />}
                  {entry.name}
                </button>
              ))}
            </nav>
            <div className="file-preview">
              {file ? (
                <>
                  <div className="file-preview-heading">
                    <code>{file.path}</code>
                    {previousId && !file.binary && (
                      <Button
                        variant="quiet"
                        onClick={async () => {
                          setError("");
                          try {
                            const previous = await api<FileResult>(
                              `/api/jobs/${previousId}/files?path=${encodeURIComponent(file.path)}`,
                            );
                            setDiff(
                              diffLines(
                                previous.content ?? "",
                                file.content ?? "",
                              ),
                            );
                          } catch {
                            setError(
                              t(
                                "Este archivo no existe en la ejecución anterior.",
                                "This file does not exist in the previous run.",
                              ),
                            );
                          }
                        }}
                      >
                        <GitCompareArrows size={14} />
                        {t("Comparar con anterior", "Compare with previous")}
                      </Button>
                    )}
                  </div>
                  {file.binary ? (
                    <p>
                      {t(
                        "Archivo binario. Descargá el ZIP para abrirlo.",
                        "Binary file. Download the ZIP to open it.",
                      )}
                    </p>
                  ) : diff ? (
                    <pre className="diff-view">
                      {diff.map((part, index) => (
                        <span
                          key={index}
                          className={
                            part.added
                              ? "diff-add"
                              : part.removed
                                ? "diff-remove"
                                : ""
                          }
                        >
                          {part.value}
                        </span>
                      ))}
                    </pre>
                  ) : (
                    <pre>
                      <code>{file.content}</code>
                    </pre>
                  )}
                  {file.truncated && (
                    <p className="field-hint">
                      {t(
                        "Vista previa truncada a 1 MB.",
                        "Preview truncated to 1 MB.",
                      )}
                    </p>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<Code2 size={26} />}
                  title={t("Elegí un archivo", "Choose a file")}
                >
                  {t(
                    "Explorá el código, las notas y la evidencia de la ejecución.",
                    "Explore the code, notes, and evidence from this run.",
                  )}
                </EmptyState>
              )}
            </div>
          </div>
        </Card>
      )}
      {tab === "learned" && (
        <Learned
          details={details}
          openFile={(path) => {
            setTab("files");
            void browse(path);
          }}
        />
      )}
      {tab === "report" && (
        <Card>
          {report ? (
            <Markdown source={report} />
          ) : (
            <EmptyState
              icon={<FileText size={27} />}
              title={
                busy === "report"
                  ? t("Cargando…", "Loading…")
                  : t(
                      "El informe todavía no está disponible",
                      "The report is not available yet",
                    )
              }
            >
              {t(
                "Aparecerá al finalizar la fase de informe. Los resultados parciales se pueden consultar en Archivos.",
                "It appears after the reporting phase. Partial results are available under Files.",
              )}
            </EmptyState>
          )}
        </Card>
      )}
    </>
  );
}

const KINDS: readonly FindingKind[] = ["observed", "inferred", "unknown"];

/** Claims from output/findings.json, each linked to its evidence and check. */
function Learned({
  details,
  openFile,
}: {
  details: JobDetails;
  openFile: (path: string) => void;
}) {
  const { t } = useLocale();
  const kindLabel: Record<FindingKind, [string, string]> = {
    observed: [t("Observado", "Observed"), t("Visto en la evidencia de REA.", "Seen in REA evidence.")],
    inferred: [t("Inferido", "Inferred"), t("Conclusión del modelo a partir de la evidencia.", "The model's conclusion from the evidence.")],
    unknown: [t("Desconocido", "Unknown"), t("Pregunta abierta: falta evidencia.", "Open question: evidence is missing.")],
  };
  // An evidence entry is a saved file or an ev_… id that a REA result reported.
  const resolve = (entry: string): string | undefined =>
    entry.includes("/") ? entry : details.evidenceFiles[entry];
  const checkFor = (finding: Finding) =>
    finding.check
      ? [...details.checks].reverse().find((check) => check.name === finding.check)
      : undefined;
  if (!details.hasFindings || details.findings.length === 0)
    return (
      <Card>
        <EmptyState
          icon={<Lightbulb size={27} />}
          title={t("Todavía no hay afirmaciones estructuradas", "No structured claims yet")}
        >
          {details.hasFindings
            ? t(
                "El informe escribió output/findings.json, pero ninguna entrada era válida.",
                "The report wrote output/findings.json, but no entry was valid.",
              )
            : t(
                "Aparecen cuando la fase de informe escribe output/findings.json. Mientras tanto, revisá el informe y la evidencia en Archivos.",
                "They appear when the report phase writes output/findings.json. Meanwhile, review the report and the evidence under Files.",
              )}
        </EmptyState>
      </Card>
    );
  return (
    <div className="learned">
      {details.findingsRejected > 0 && (
        <p className="field-hint">
          {t(
            `${details.findingsRejected} entradas mal formadas no se muestran.`,
            `${details.findingsRejected} malformed entries are not shown.`,
          )}
        </p>
      )}
      {KINDS.map((kind) => {
        const items = details.findings.filter((finding) => finding.kind === kind);
        if (items.length === 0) return null;
        return (
          <Card key={kind} className={`learned-group learned-${kind}`}>
            <div className="section-heading">
              <div>
                <h2>
                  {kindLabel[kind][0]} <small>{items.length}</small>
                </h2>
                <p className="field-hint">{kindLabel[kind][1]}</p>
              </div>
            </div>
            <ul>
              {items.map((finding, index) => {
                const check = checkFor(finding);
                return (
                  <li key={index}>
                    <p>{finding.claim}</p>
                    <div className="learned-links">
                      {finding.evidence.map((entry) => {
                        const path = resolve(entry);
                        return path ? (
                          <button key={entry} className="text-link" onClick={() => openFile(path)}>
                            {entry}
                          </button>
                        ) : (
                          <code key={entry} title={t("Evidencia no encontrada en esta ejecución", "Evidence not found in this run")}>
                            {entry}
                          </code>
                        );
                      })}
                      {finding.check && (
                        <span className={`learned-check ${check ? (check.passed ? "passed" : "failed") : "missing"}`}>
                          {check
                            ? `${finding.check} · ${check.passed ? t("pasó", "passed") : t("falló", "failed")}`
                            : `${finding.check} · ${t("sin registrar", "not recorded")}`}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
