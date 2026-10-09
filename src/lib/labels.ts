import type { HealthLevel, MilestoneState } from "./metrics";
import type { FindingStatus, FindingType, Impact, Priority, TaskStatus } from "./types";

/** Design-system state palettes (see --state-* tokens in globals.css). */
export type UiState = "pending" | "in-progress" | "blocked" | "completed";

export const stateVar = (state: UiState, part: "bg" | "fg" | "bar") => `var(--state-${state}-${part})`;

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Pendiente",
  in_progress: "En progreso",
  blocked: "Bloqueada",
  done: "Completada",
};

export const TASK_STATUS_STATE: Record<TaskStatus, UiState> = {
  todo: "pending",
  in_progress: "in-progress",
  blocked: "blocked",
  done: "completed",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export const HEALTH_LABEL: Record<HealthLevel, string> = {
  green: "Verde",
  yellow: "Amarillo",
  red: "Rojo",
};

export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = {
  done: "Cumplido",
  overdue: "Vencido",
  at_risk: "En riesgo",
  on_track: "En curso",
};

export const MILESTONE_STATE_UI: Record<MilestoneState, UiState> = {
  done: "completed",
  overdue: "blocked",
  at_risk: "blocked",
  on_track: "in-progress",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const IMPACT_LABEL: Record<Impact, string> = {
  high: "Impacto alto",
  medium: "Impacto medio",
  low: "Impacto bajo",
};

export const IMPACT_DOT: Record<Impact, string> = {
  high: "var(--state-blocked-bar)",
  medium: "var(--accent)",
  low: "var(--state-pending-bar)",
};

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  risk: "Riesgos",
  finding: "Hallazgos",
  requirement: "Requerimientos",
};

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Abierto",
  mitigated: "Mitigado",
  closed: "Cerrado",
};

export const FINDING_STATUS_STATE: Record<FindingStatus, UiState> = {
  open: "in-progress",
  mitigated: "pending",
  closed: "completed",
};
