// Shared design-system classes for buttons and form fields (Flock DS §5).

export const primaryButton =
  "inline-flex items-center justify-center gap-[7px] rounded-[9px] bg-brand px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButton =
  "inline-flex items-center justify-center gap-[7px] rounded-[9px] border border-line-strong bg-panel px-4 py-[9px] text-[13px] font-semibold text-ink transition-colors hover:bg-surface active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButton =
  "inline-flex items-center justify-center gap-[7px] rounded-[9px] px-4 py-[9px] text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 active:translate-y-px bg-[var(--state-blocked-bar)]";

export const iconButton =
  "grid size-[30px] place-items-center rounded-[6px] text-ink-faint transition-colors hover:bg-brand-soft hover:text-brand";

export const fieldLabel = "text-[11px] font-bold uppercase tracking-[.5px] text-ink-faint";

export const inputClass =
  "w-full rounded-[8px] border border-line-strong bg-panel px-[11px] py-[9px] text-[13px] text-ink focus:border-brand focus:outline-2 focus:outline-brand-soft";
