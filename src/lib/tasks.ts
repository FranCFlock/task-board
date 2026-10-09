import type { ISODate, Priority, Task, TaskStatus } from "./types";

/** A task as edited in the form, before it gets an id. */
export type TaskDraft = Omit<Task, "id">;
export type TaskErrors = Partial<Record<keyof TaskDraft, string>>;

export const TASK_LIMITS = { title: 120, owner: 60, blockedReason: 300, maxTasks: 300 };

const STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

function isISODate(value: string): value is ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Trims text and drops the blocked reason unless the task is blocked. */
export function normalizeTask<T extends TaskDraft>(task: T): T {
  const { blockedReason, ...rest } = task;
  const normalized = { ...rest, title: task.title.trim(), owner: task.owner.trim() } as T;
  if (task.status === "blocked") normalized.blockedReason = (blockedReason ?? "").trim();
  return normalized;
}

/** Form validation. Messages are user-facing (Spanish). */
export function validateTask(draft: TaskDraft, milestoneIds: string[]): TaskErrors {
  const t = normalizeTask(draft);
  const errors: TaskErrors = {};
  if (!t.title) errors.title = "Ingresá un título.";
  else if (t.title.length > TASK_LIMITS.title) errors.title = `Máximo ${TASK_LIMITS.title} caracteres.`;
  if (!t.owner) errors.owner = "Ingresá un responsable.";
  else if (t.owner.length > TASK_LIMITS.owner) errors.owner = `Máximo ${TASK_LIMITS.owner} caracteres.`;
  if (!STATUSES.includes(t.status)) errors.status = "Elegí un estado.";
  if (!PRIORITIES.includes(t.priority)) errors.priority = "Elegí una prioridad.";
  if (!isISODate(t.dueDate)) errors.dueDate = "Ingresá una fecha válida.";
  if (!milestoneIds.includes(t.milestoneId)) errors.milestoneId = "Elegí un hito.";
  if (t.status === "blocked") {
    if (!t.blockedReason) errors.blockedReason = "Contá por qué está bloqueada.";
    else if (t.blockedReason.length > TASK_LIMITS.blockedReason) {
      errors.blockedReason = `Máximo ${TASK_LIMITS.blockedReason} caracteres.`;
    }
  }
  return errors;
}

/**
 * Validates an untrusted task list (from localStorage or a request body).
 * Returns null if anything is malformed, so callers can fall back to the demo data.
 */
export function parseTasks(value: unknown, milestoneIds: string[]): Task[] | null {
  if (!Array.isArray(value) || value.length > TASK_LIMITS.maxTasks) return null;
  const ids = new Set<string>();
  const tasks: Task[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const raw = item as Record<string, unknown>;
    const fields = ["id", "title", "owner", "status", "priority", "dueDate", "milestoneId"] as const;
    if (fields.some((f) => typeof raw[f] !== "string")) return null;
    if (raw.blockedReason !== undefined && typeof raw.blockedReason !== "string") return null;

    const task = normalizeTask({
      id: raw.id as string,
      title: raw.title as string,
      owner: raw.owner as string,
      status: raw.status as TaskStatus,
      priority: raw.priority as Priority,
      dueDate: raw.dueDate as string,
      milestoneId: raw.milestoneId as string,
      blockedReason: raw.blockedReason as string | undefined,
    });
    if (!task.id || ids.has(task.id) || Object.keys(validateTask(task, milestoneIds)).length > 0) return null;
    ids.add(task.id);
    tasks.push(task);
  }
  return tasks;
}

export function newTaskId(): string {
  return `t-${crypto.randomUUID().slice(0, 8)}`;
}
