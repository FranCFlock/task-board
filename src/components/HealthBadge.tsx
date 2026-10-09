import { HEALTH_LABEL } from "@/lib/labels";
import type { Health, HealthLevel } from "@/lib/metrics";

const DOT_COLOR: Record<HealthLevel, string> = {
  green: "var(--state-completed-bar)",
  yellow: "var(--accent)",
  red: "var(--state-blocked-bar)",
};

/** Traffic light with reasons, designed to sit on the brand gradient header. */
export default function HealthBadge({ health }: { health: Health }) {
  return (
    <div className="rounded-card bg-white/[.14] p-4 text-white">
      <div className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full ring-2 ring-white"
          style={{ background: DOT_COLOR[health.level] }}
        />
        <span className="t-caption">Salud del proyecto</span>
        <span className="t-card-title ml-auto">{HEALTH_LABEL[health.level]}</span>
      </div>
      <ul className="mt-3 space-y-1 text-[12.5px] font-medium">
        {health.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span aria-hidden>•</span>
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
