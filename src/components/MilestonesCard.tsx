import StatusChip from "@/components/StatusChip";
import { formatDate } from "@/lib/dates";
import { MILESTONE_STATE_LABEL, MILESTONE_STATE_UI, stateVar } from "@/lib/labels";
import type { MilestoneSummary, NextMilestone } from "@/lib/metrics";

function daysLabel(days: number) {
  if (days === 0) return "Vence hoy";
  return days === 1 ? "Falta 1 día" : `Faltan ${days} días`;
}

export default function MilestonesCard({
  milestones,
  next,
}: {
  milestones: MilestoneSummary[];
  next: NextMilestone | null;
}) {
  return (
    <section className="rounded-card border border-line bg-panel p-4 shadow-card">
      <h2 className="t-card-title text-brand-dark">Hitos</h2>

      {next ? (
        <div className="mt-3 rounded-card bg-surface p-3">
          <div className="t-caption text-ink-faint">Próximo hito</div>
          <div className="mt-1 font-semibold text-brand-dark">{next.milestone.name}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-[20px] bg-brand-soft px-2 py-[2px] text-[10.5px] font-bold text-brand">
              {daysLabel(next.daysLeft)}
            </span>
            <span className="t-secondary">{formatDate(next.milestone.dueDate)}</span>
          </div>
        </div>
      ) : (
        <p className="t-secondary mt-3">No quedan hitos pendientes.</p>
      )}

      <ul className="mt-4 space-y-4">
        {milestones.map(({ milestone, state, doneTasks, totalTasks }) => {
          const pct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
          const ui = MILESTONE_STATE_UI[state];
          return (
            <li key={milestone.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{milestone.name}</div>
                  <div className="t-secondary">{formatDate(milestone.dueDate)}</div>
                </div>
                <StatusChip state={ui}>{MILESTONE_STATE_LABEL[state]}</StatusChip>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-[20px] bg-surface">
                  <div className="h-full rounded-[20px]" style={{ width: `${pct}%`, background: stateVar(ui, "bar") }} />
                </div>
                <span className="text-mono text-[12.5px] text-ink-soft">
                  {doneTasks}/{totalTasks}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
