interface KpiCardProps {
  label: string;
  value: string | number;
  detail?: string;
  /** CSS color for the label dot, e.g. "var(--accent)". */
  dotColor: string;
}

export default function KpiCard({ label, value, detail, dotColor }: KpiCardProps) {
  return (
    <div className="rounded-card border border-line bg-panel p-4 shadow-card">
      <div className="t-caption flex items-center gap-2 text-ink-faint">
        <span className="size-2 shrink-0 rounded-full" style={{ background: dotColor }} />
        {label}
      </div>
      <div className="text-mono mt-2 text-[28px] font-extrabold leading-none text-brand-dark">{value}</div>
      {detail && <div className="t-secondary mt-2">{detail}</div>}
    </div>
  );
}

export function ProgressCard({ pct, done, total }: { pct: number; done: number; total: number }) {
  return (
    <div className="stat-card-hero rounded-card p-4 shadow-card">
      <div className="t-caption">Avance del proyecto</div>
      <div className="text-mono mt-2 text-[28px] font-extrabold leading-none">{pct}%</div>
      <div className="mt-3 h-2 overflow-hidden rounded-[20px] bg-white/[.14]">
        <div className="h-full rounded-[20px] bg-white" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-[12.5px] font-medium">
        {done} de {total} tareas completadas
      </div>
    </div>
  );
}
