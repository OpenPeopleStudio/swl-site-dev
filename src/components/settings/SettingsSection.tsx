import type { ReactNode } from "react";

type SectionProps = {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
};

export function SettingsSection({ kicker, title, description, children, actions, id, className = "" }: SectionProps) {
  return (
    <section
      id={id}
      className={`border-b border-white/10 pb-8 last:border-transparent last:pb-0 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40 whitespace-nowrap">{kicker}</p>
          <h2 className="text-sm font-semibold text-white whitespace-nowrap">{title}</h2>
          {description && <p className="max-w-xl text-xs leading-relaxed text-white/60">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  helper?: string;
  children: ReactNode;
  inline?: boolean;
};

export function SettingsField({ label, helper, children, inline }: FieldProps) {
  return (
    <div className={`flex ${inline ? "flex-row items-center gap-3" : "flex-col gap-1"}`}>
      <div className="flex min-w-[140px] flex-col">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-white/60 whitespace-nowrap truncate">
          {label}
        </span>
        {helper && <span className="text-xs text-white/50">{helper}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

