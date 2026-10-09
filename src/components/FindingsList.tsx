import StatusChip from "@/components/StatusChip";
import {
  FINDING_STATUS_LABEL,
  FINDING_STATUS_STATE,
  FINDING_TYPE_LABEL,
  IMPACT_DOT,
  IMPACT_LABEL,
} from "@/lib/labels";
import type { Finding, FindingStatus, FindingType, Impact } from "@/lib/types";

const TYPE_ORDER: FindingType[] = ["risk", "finding", "requirement"];
const STATUS_RANK: Record<FindingStatus, number> = { open: 0, mitigated: 1, closed: 2 };
const IMPACT_RANK: Record<Impact, number> = { high: 0, medium: 1, low: 2 };

/** Surveyed items grouped by type; open and high-impact first. */
export default function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <div className="space-y-4">
      {TYPE_ORDER.map((type) => {
        const items = findings
          .filter((f) => f.type === type)
          .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact]);
        if (items.length === 0) return null;
        const open = items.filter((f) => f.status === "open").length;

        return (
          <section key={type} className="rounded-card border border-line bg-panel shadow-card">
            <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
              <h3 className="t-card-title text-heading">{FINDING_TYPE_LABEL[type]}</h3>
              <span className="t-secondary">
                {open} abierto{open === 1 ? "" : "s"} de {items.length}
              </span>
            </header>
            <ul>
              {items.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{f.description}</div>
                    <div className="t-secondary">{f.owner ?? "Sin responsable asignado"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 whitespace-nowrap text-[12.5px] font-medium text-ink-soft">
                      <span className="size-2 rounded-full" style={{ background: IMPACT_DOT[f.impact] }} />
                      {IMPACT_LABEL[f.impact]}
                    </span>
                    <StatusChip state={FINDING_STATUS_STATE[f.status]}>{FINDING_STATUS_LABEL[f.status]}</StatusChip>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
