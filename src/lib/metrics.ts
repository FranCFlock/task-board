import { daysBetween, toISODate } from "./dates";
import type {
  ActionItem,
  Finding,
  Impact,
  ISODate,
  Milestone,
  ProjectData,
  Task,
  TaskStatus,
} from "./types";

export type HealthLevel = "green" | "yellow" | "red";

export interface Health {
  level: HealthLevel;
  reasons: string[];
}

export interface NextMilestone {
  milestone: Milestone;
  daysLeft: number;
}

export interface Metrics {
  today: ISODate;
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  /** Done tasks over total, 0–100. */
  progressPct: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: Task[];
  /** Overdue tasks over open tasks, 0–100. */
  overdueOpenPct: number;
  blockedTasks: Task[];
  openActionItems: ActionItem[];
  overdueActionItems: ActionItem[];
  openRisks: Finding[];
  openRisksByImpact: Record<Impact, number>;
  nextMilestone: NextMilestone | null;
  overdueMilestones: Milestone[];
}

// Health thresholds, as % of open tasks that are overdue.
export const RED_OVERDUE_PCT = 20;
export const YELLOW_OVERDUE_PCT = 10;

const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

export function computeMetrics(data: ProjectData, today: ISODate = toISODate(new Date())): Metrics {
  const { project, tasks, actionItems, findings } = data;

  const tasksByStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const t of tasks) tasksByStatus[t.status]++;

  const openTaskList = tasks.filter((t) => t.status !== "done");
  const overdueTasks = openTaskList.filter((t) => t.dueDate < today);

  const openActionItems = actionItems.filter((a) => a.status === "open");
  const overdueActionItems = openActionItems.filter((a) => a.dueDate < today);

  const openRisks = findings.filter((f) => f.type === "risk" && f.status === "open");
  const openRisksByImpact: Record<Impact, number> = { low: 0, medium: 0, high: 0 };
  for (const r of openRisks) openRisksByImpact[r.impact]++;

  const pendingMilestones = project.milestones
    .filter((m) => m.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueMilestones = pendingMilestones.filter((m) => m.dueDate < today);
  const upcoming = pendingMilestones.find((m) => m.dueDate >= today);

  return {
    today,
    totalTasks: tasks.length,
    doneTasks: tasksByStatus.done,
    openTasks: openTaskList.length,
    progressPct: pct(tasksByStatus.done, tasks.length),
    tasksByStatus,
    overdueTasks,
    overdueOpenPct: pct(overdueTasks.length, openTaskList.length),
    blockedTasks: tasks.filter((t) => t.status === "blocked"),
    openActionItems,
    overdueActionItems,
    openRisks,
    openRisksByImpact,
    nextMilestone: upcoming
      ? { milestone: upcoming, daysLeft: daysBetween(today, upcoming.dueDate) }
      : null,
    overdueMilestones,
  };
}

const plural = (n: number, singular: string, pluralForm: string) =>
  `${n} ${n === 1 ? singular : pluralForm}`;

/** Traffic light. Reasons are listed most severe first. */
export function computeHealth(m: Metrics): Health {
  const red: string[] = [];
  const yellow: string[] = [];

  const overdueReason = `${m.overdueOpenPct}% de las tareas abiertas están vencidas (${m.overdueTasks.length} de ${m.openTasks})`;
  if (m.overdueOpenPct > RED_OVERDUE_PCT) red.push(overdueReason);
  else if (m.overdueOpenPct > YELLOW_OVERDUE_PCT) yellow.push(overdueReason);

  for (const ms of m.overdueMilestones) red.push(`Hito vencido sin cumplir: ${ms.name}`);

  const highRisks = m.openRisksByImpact.high;
  if (highRisks > 0) red.push(`${plural(highRisks, "riesgo", "riesgos")} de impacto alto abierto${highRisks === 1 ? "" : "s"}`);

  const blocked = m.blockedTasks.length;
  if (blocked > 0) yellow.push(plural(blocked, "tarea bloqueada", "tareas bloqueadas"));

  const overdueItems = m.overdueActionItems.length;
  if (overdueItems > 0) {
    yellow.push(plural(overdueItems, "pendiente de reunión vencido", "pendientes de reunión vencidos"));
  }

  if (red.length > 0) return { level: "red", reasons: [...red, ...yellow] };
  if (yellow.length > 0) return { level: "yellow", reasons: yellow };
  return { level: "green", reasons: ["Sin desvíos: tareas, hitos, riesgos y pendientes en orden"] };
}
