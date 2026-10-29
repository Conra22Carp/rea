"use client";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { JobStatus, VerificationSummary } from "@rea-studio/core/types";
import { PRICE_STALE_DAYS, priceAgeDays, type ModelPricing } from "@rea-studio/core/pricing";
import { AlertCircle, LoaderCircle, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { statusLabel, useLocale, verificationLabel } from "./Locale";
export const buttonClass = (
  variant: "primary" | "ghost" | "danger" | "quiet" = "primary",
  extra = "",
) => `button button-${variant} ${extra}`;
export const Button = ({
  variant = "primary",
  className = "",
  busy = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
  busy?: boolean;
}) => (
  <button
    {...props}
    disabled={props.disabled || busy}
    className={buttonClass(variant, className)}
  >
    {busy && <LoaderCircle size={16} className="spin" />}
    {children}
  </button>
);
export const Input = ({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`field-input ${className}`} />
);
/**
 * A number field that keeps the typed text while it is being edited, so a
 * cleared field does not turn into a 0 that the next digits append to.
 */
export const NumberInput = ({
  value,
  onValueChange,
  onBlur,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
}) => {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((current) =>
      current.trim() !== "" && Number(current) === value ? current : String(value),
    );
  }, [value]);
  return (
    <Input
      {...props}
      type="number"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const next = event.target.valueAsNumber;
        if (event.target.value.trim() !== "" && Number.isFinite(next)) onValueChange(next);
      }}
      onBlur={(event) => {
        if (text.trim() === "") setText(String(value));
        onBlur?.(event);
      }}
    />
  );
};
export const Textarea = ({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`field-input field-textarea ${className}`} />
);
export const Select = ({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`field-input field-select ${className}`} />
);
export const Field = ({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) => (
  <div className="field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <p className="field-hint">{hint}</p>}
  </div>
);
export const Card = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <section className={`card ${className}`}>{children}</section>;
export const PageTitle = ({
  title,
  children,
  actions,
}: {
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="page-heading">
    <div>
      <h1>{title}</h1>
      {children && <p className="page-description">{children}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);
export const StatusPill = ({ status }: { status: JobStatus }) => {
  const { locale } = useLocale();
  return (
    <span className={`status status-${status}`}>
      <span />
      {statusLabel(status, locale)}
    </span>
  );
};
export const VerificationBadge = ({
  verification,
}: {
  verification: VerificationSummary;
}) => {
  const { locale } = useLocale();
  const Icon =
    verification.status === "verified"
      ? ShieldCheck
      : verification.status === "failed"
        ? ShieldAlert
        : ShieldQuestion;
  return (
    <span className={`verification verification-${verification.status}`}>
      <Icon size={12} />
      {verificationLabel(verification, locale)}
    </span>
  );
};
/** When a reference price was checked, and a warning once it is old. */
export const PriceAge = ({ pricing }: { pricing: Pick<ModelPricing, "checkedAt"> }) => {
  const { t, locale } = useLocale();
  const days = priceAgeDays(pricing);
  if (days === undefined) return null;
  const date = new Date(`${pricing.checkedAt}T12:00:00Z`).toLocaleDateString(locale === "es" ? "es-AR" : "en-US");
  const stale = days > PRICE_STALE_DAYS;
  return (
    <small className={`price-age ${stale ? "stale" : ""}`}>
      {stale
        ? t(`Tarifa del ${date}: puede estar desactualizada`, `Rate from ${date}: may be outdated`)
        : t(`Tarifa consultada el ${date}`, `Rate checked ${date}`)}
    </small>
  );
};
export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="tag">{children}</span>
);
export const ErrorNotice = ({ message }: { message?: string }) => {
  const { t } = useLocale();
  return message ? (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>
          {t(
            "No se pudo completar la operación",
            "Could not complete this action",
          )}
        </strong>
        <p>{message}</p>
      </div>
    </div>
  ) : null;
};
export const EmptyState = ({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <div className="empty-state">
    <span className="empty-icon">{icon}</span>
    <h3>{title}</h3>
    <p>{children}</p>
    {action}
  </div>
);
