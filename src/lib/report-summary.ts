import { addDays, daysBetween } from "./dates";
import type { Health, Metrics, MilestoneState } from "./metrics";
import type { Impact, ISODate, ProjectData, TaskStatus } from "./types";

/** Days considered "the period" for achievements and "upcoming" for next steps. */
export const PERIOD_DAYS = 14;
export const UPCOMING_DAYS = 7;

/**
 * Structured, pre-computed snapshot used by both the template report and the LLM prompt.
 * Keeps the LLM away from the raw JSON and keeps both outputs consistent.
 */
export interface ReportSummary {
  project: { name: string; client: string; startDate: ISODate; endDate: ISODate };
  today: ISODate;
  periodStart: ISODate;
  health: Health;
  progress: { pct: number; done: number; total: number; byStatus: Record<TaskStatus, number> };
  milestones: { name: string; dueDate: ISODate; state: MilestoneState; done: number; total: number }[];
  nextMilestone: { name: string; dueDate: ISODate; daysLeft: number; done: number; total: number } | null;
  recentlyDone: { title: string; owner: string; completedAt: ISODate }[];
  closedActionItems: { description: string; owner: string }[];
  upcomingTasks: { title: string; owner: string; dueDate: ISODate; status: TaskStatus }[];
  blockedTasks: { title: string; owner: string; reason: string; dueDate: ISODate }[];
  overdueTasks: { title: string; owner: string; dueDate: ISODate; daysOverdue: number }[];
  openActionItems: { description: string; owner: string; dueDate: ISODate; overdue: boolean; meeting: string }[];
  openRisks: { description: string; impact: Impact; owner?: string }[];
  openHighImpactFindings: { description: string; type: "requirement" | "finding"; owner?: string }[];
}

const IMPACT_RANK: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
const byDueDate = <T extends { dueDate: ISODate }>(a: T, b: T) => a.dueDate.localeCompare(b.dueDate);

export function buildReportSummary(data: ProjectData, m: Metrics, health: Health): ReportSummary {
  const { project, tasks, actionItems, findings } = data;
  const today = m.today;
  const periodStart = addDays(today, -PERIOD_DAYS);
  const upcomingEnd = addDays(today, UPCOMING_DAYS);
  const next = m.nextMilestone && m.milestones.find((s) => s.milestone.id === m.nextMilestone!.milestone.id);

  return {
    project: { name: project.name, client: project.client, startDate: project.startDate, endDate: project.endDate },
    today,
    periodStart,
    health,
    progress: { pct: m.progressPct, done: m.doneTasks, total: m.totalTasks, byStatus: m.tasksByStatus },
    milestones: m.milestones.map((s) => ({
      name: s.milestone.name,
      dueDate: s.milestone.dueDate,
      state: s.state,
      done: s.doneTasks,
      total: s.totalTasks,
    })),
    nextMilestone: next
      ? {
          name: next.milestone.name,
          dueDate: next.milestone.dueDate,
          daysLeft: m.nextMilestone!.daysLeft,
          done: next.doneTasks,
          total: next.totalTasks,
        }
      : null,
    recentlyDone: tasks
      .flatMap((t) => (t.status === "done" ? [{ title: t.title, owner: t.owner, completedAt: t.completedAt ?? t.dueDate }] : []))
      .filter((t) => t.completedAt >= periodStart && t.completedAt <= today)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    closedActionItems: actionItems
      .filter((a) => a.status === "done" && a.meetingDate >= periodStart)
      .map((a) => ({ description: a.description, owner: a.owner })),
    upcomingTasks: tasks
      .filter((t) => t.status !== "done" && t.dueDate >= today && t.dueDate <= upcomingEnd)
      .sort(byDueDate)
      .map((t) => ({ title: t.title, owner: t.owner, dueDate: t.dueDate, status: t.status })),
    blockedTasks: m.blockedTasks
      .slice()
      .sort(byDueDate)
      .map((t) => ({ title: t.title, owner: t.owner, reason: t.blockedReason ?? "Sin motivo informado", dueDate: t.dueDate })),
    overdueTasks: m.overdueTasks
      .slice()
      .sort(byDueDate)
      .map((t) => ({ title: t.title, owner: t.owner, dueDate: t.dueDate, daysOverdue: daysBetween(t.dueDate, today) })),
    openActionItems: m.openActionItems
      .slice()
      .sort(byDueDate)
      .map((a) => ({
        description: a.description,
        owner: a.owner,
        dueDate: a.dueDate,
        overdue: a.dueDate < today,
        meeting: a.sourceMeeting,
      })),
    openRisks: m.openRisks
      .slice()
      .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact])
      .map((r) => ({ description: r.description, impact: r.impact, owner: r.owner })),
    openHighImpactFindings: findings
      .filter((f) => f.type !== "risk" && f.impact === "high" && f.status === "open")
      .map((f) => ({ description: f.description, type: f.type as "requirement" | "finding", owner: f.owner })),
  };
}
