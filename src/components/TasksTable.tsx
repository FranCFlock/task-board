"use client";

import { useMemo, useState } from "react";
import StatusChip from "@/components/StatusChip";
import { fieldLabel, ghostButton, iconButton, primaryButton } from "@/components/ui";
import { daysBetween, formatDate } from "@/lib/dates";
import {
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_STATE,
} from "@/lib/labels";
import type { ISODate, Milestone, Priority, Task, TaskStatus } from "@/lib/types";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const ALL = "all";

const selectClass =
  "rounded-[8px] border border-line-strong bg-panel px-[11px] py-[9px] text-[13px] text-ink focus:border-brand focus:outline-2 focus:outline-brand-soft";

function overdueLabel(days: number) {
  return days === 1 ? "Vencida hace 1 día" : `Vencida hace ${days} días`;
}

export default function TasksTable({
  tasks,
  milestones,
  today,
  onNew,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  milestones: Milestone[];
  /** Passed from the server so server and client agree on what is overdue. */
  today: ISODate;
  onNew: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [status, setStatus] = useState<TaskStatus | typeof ALL>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [priority, setPriority] = useState<Priority | typeof ALL>(ALL);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const owners = useMemo(() => [...new Set(tasks.map((t) => t.owner))].sort(), [tasks]);
  const milestoneName = useMemo(() => new Map(milestones.map((m) => [m.id, m.name])), [milestones]);

  const isOverdue = (t: Task) => t.status !== "done" && t.dueDate < today;

  const visible = tasks
    .filter(
      (t) =>
        (status === ALL || t.status === status) &&
        (owner === ALL || t.owner === owner) &&
        (priority === ALL || t.priority === priority) &&
        (!onlyOverdue || isOverdue(t)),
    )
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.dueDate.localeCompare(b.dueDate));

  const hasFilters = status !== ALL || owner !== ALL || priority !== ALL || onlyOverdue;
  const clearFilters = () => {
    setStatus(ALL);
    setOwner(ALL);
    setPriority(ALL);
    setOnlyOverdue(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4 rounded-card border border-line bg-panel p-4 shadow-card">
        <label className="flex flex-col gap-[6px]">
          <span className={fieldLabel}>Estado</span>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            <option value={ALL}>Todos</option>
            {TASK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className={fieldLabel}>Responsable</span>
          <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value={ALL}>Todos</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className={fieldLabel}>Prioridad</span>
          <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value={ALL}>Todas</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 py-[9px] text-[13px] font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-[var(--brand)]"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
          />
          Solo vencidas
        </label>
        <div className="flex-1" />
        <button type="button" onClick={clearFilters} disabled={!hasFilters} className={ghostButton}>
          Limpiar filtros
        </button>
        <button type="button" onClick={onNew} className={primaryButton}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva tarea
        </button>
      </div>

      <p className="t-secondary">
        Mostrando {visible.length} de {tasks.length} tareas
      </p>

      <div className="overflow-x-auto rounded-card border border-line bg-panel shadow-card">
        <table className="w-full min-w-[840px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b-2 border-line-strong bg-surface">
              {["Tarea", "Responsable", "Estado", "Prioridad", "Hito", "Vence"].map((h) => (
                <th key={h} className="t-caption px-4 py-3 text-ink-faint">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const overdue = isOverdue(t);
              return (
                <tr key={t.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{t.title}</div>
                    {t.status === "blocked" && t.blockedReason && (
                      <div className="mt-1 text-[12.5px] font-medium" style={{ color: "var(--state-blocked-fg)" }}>
                        Motivo: {t.blockedReason}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{t.owner}</td>
                  <td className="px-4 py-3">
                    <StatusChip state={TASK_STATUS_STATE[t.status]}>{TASK_STATUS_LABEL[t.status]}</StatusChip>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-[20px] px-[11px] py-[3px] text-[11px] font-bold ${
                        t.priority === "high" ? "bg-brand-soft text-brand" : "bg-surface text-ink-soft"
                      }`}
                    >
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{milestoneName.get(t.milestoneId) ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div
                      className={`tabular-nums ${overdue ? "font-bold" : "text-ink-soft"}`}
                      style={overdue ? { color: "var(--state-blocked-fg)" } : undefined}
                    >
                      {formatDate(t.dueDate)}
                    </div>
                    {overdue && (
                      <div className="text-[11px] font-bold" style={{ color: "var(--state-blocked-fg)" }}>
                        {overdueLabel(daysBetween(t.dueDate, today))}
                      </div>
                    )}
                    {t.status === "done" && t.completedAt && (
                      <div className="text-[11px] font-bold" style={{ color: "var(--state-completed-fg)" }}>
                        Completada el {formatDate(t.completedAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className={iconButton}
                        aria-label={`Editar "${t.title}"`}
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 20h4L19 9l-4-4L4 16z" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t)}
                        className={iconButton}
                        aria-label={`Eliminar "${t.title}"`}
                        title="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="t-secondary px-4 py-8 text-center">
                  {tasks.length === 0 ? "Todavía no hay tareas. Creá la primera con «Nueva tarea»." : "No hay tareas que coincidan con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
