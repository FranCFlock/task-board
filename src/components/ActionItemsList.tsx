import StatusChip from "@/components/StatusChip";
import { formatDate } from "@/lib/dates";
import type { UiState } from "@/lib/labels";
import type { ActionItem, ISODate } from "@/lib/types";

function itemState(item: ActionItem, today: ISODate): { state: UiState; label: string } {
  if (item.status === "done") return { state: "completed", label: "Hecho" };
  if (item.dueDate < today) return { state: "blocked", label: "Vencido" };
  return { state: "in-progress", label: "Abierto" };
}

/** Meeting action items, grouped by meeting (most recent first). */
export default function ActionItemsList({ items, today }: { items: ActionItem[]; today: ISODate }) {
  const meetings = new Map<string, { date: ISODate; items: ActionItem[] }>();
  for (const item of items) {
    const meeting = meetings.get(item.sourceMeeting) ?? { date: item.meetingDate, items: [] };
    meeting.items.push(item);
    meetings.set(item.sourceMeeting, meeting);
  }
  const groups = [...meetings.entries()].sort(([, a], [, b]) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      {groups.map(([name, meeting]) => (
        <section key={name} className="rounded-card border border-line bg-panel shadow-card">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="t-card-title text-heading">{name}</h3>
            <span className="t-secondary">Reunión del {formatDate(meeting.date)}</span>
          </header>
          <ul>
            {[...meeting.items]
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .map((item) => {
                const { state, label } = itemState(item, today);
                const overdue = state === "blocked";
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold ${item.status === "done" ? "text-ink-soft line-through" : ""}`}>
                        {item.description}
                      </div>
                      <div className="t-secondary">{item.owner}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`whitespace-nowrap text-[12.5px] tabular-nums ${overdue ? "font-bold" : "text-ink-soft"}`}
                        style={overdue ? { color: "var(--danger-text)" } : undefined}
                      >
                        Vence {formatDate(item.dueDate)}
                      </span>
                      <StatusChip state={state}>{label}</StatusChip>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
