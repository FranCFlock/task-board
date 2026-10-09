import { formatDate } from "./dates";
import { HEALTH_LABEL, MILESTONE_STATE_LABEL, TASK_STATUS_LABEL } from "./labels";
import type { HealthLevel } from "./metrics";
import type { ReportSummary } from "./report-summary";

// Keep the report around one page: each group of items is capped separately.
const MAX_PER_GROUP = 3;

const HEALTH_HEADLINE: Record<HealthLevel, string> = {
  green: "El proyecto avanza según lo planificado.",
  yellow: "El proyecto avanza con desvíos que requieren seguimiento.",
  red: "El proyecto está en riesgo y requiere intervención.",
};

const HEALTH_EMOJI: Record<HealthLevel, string> = { green: "🟢", yellow: "🟡", red: "🔴" };

const IMPACT_TEXT = { high: "alto", medium: "medio", low: "bajo" } as const;

const days = (n: number) => (n === 1 ? "1 día" : `${n} días`);

function cap(items: string[], noun: string, max = MAX_PER_GROUP): string[] {
  // Hiding a single item saves no space, so only summarize two or more.
  if (items.length <= max + 1) return items;
  return [...items.slice(0, max), `… y ${items.length - max} ${noun}`];
}

function list(items: string[], empty: string): string {
  return items.length === 0 ? `- ${empty}` : items.map((i) => `- ${i}`).join("\n");
}

/** Deterministic status report, used when there is no API key or the LLM fails. */
export function renderTemplateReport(s: ReportSummary): string {
  const { project, health, progress } = s;
  const doneMilestones = s.milestones.filter((m) => m.state === "done");

  const achievements = [
    ...doneMilestones.map((m) => `Hito cumplido: **${m.name}**`),
    ...cap(
      s.recentlyDone.map((t) => `Completada: ${t.title} (${t.owner})`),
      "tareas completadas más",
    ),
    ...cap(
      s.closedActionItems.map((a) => `Pendiente cerrado: ${a.description} (${a.owner})`),
      "pendientes cerrados más",
    ),
  ];

  const nextSteps = [
    ...(s.nextMilestone
      ? [
          `Próximo hito: **${s.nextMilestone.name}**, vence el ${formatDate(s.nextMilestone.dueDate)} ` +
            `(faltan ${days(s.nextMilestone.daysLeft)}; ${s.nextMilestone.done}/${s.nextMilestone.total} tareas completas)`,
        ]
      : []),
    ...cap(
      s.upcomingTasks.map((t) => `${t.title} — ${t.owner}, vence el ${formatDate(t.dueDate)}`),
      "tareas más esta semana",
      5,
    ),
  ];

  const risks = [
    ...s.blockedTasks.map((t) => `**Bloqueada:** ${t.title} (${t.owner}). Motivo: ${t.reason}`),
    ...cap(
      s.overdueTasks
        .filter((t) => !s.blockedTasks.some((b) => b.title === t.title))
        .map((t) => `**Vencida hace ${days(t.daysOverdue)}:** ${t.title} (${t.owner})`),
      "tareas vencidas más",
    ),
    ...cap(
      s.openRisks.map((r) => `**Riesgo ${IMPACT_TEXT[r.impact]}:** ${r.description}${r.owner ? ` (${r.owner})` : ""}`),
      "riesgos más",
    ),
  ];

  const decisions = [
    ...s.blockedTasks.map((t) => `Destrabar "${t.title}": ${t.reason}`),
    ...cap(
      s.openActionItems
        .filter((a) => a.overdue)
        .map((a) => `Cerrar pendiente vencido: ${a.description} (${a.owner}, vencía el ${formatDate(a.dueDate)})`),
      "pendientes vencidos más",
    ),
    ...cap(
      s.openHighImpactFindings.map((f) => `Definir tratamiento de: ${f.description}`),
      "temas más",
    ),
  ];

  const statusBreakdown = (Object.keys(progress.byStatus) as (keyof typeof progress.byStatus)[])
    .map((k) => `${TASK_STATUS_LABEL[k]}: ${progress.byStatus[k]}`)
    .join(" · ");

  const milestoneLine = s.milestones
    .map((m) => `${m.name} (${MILESTONE_STATE_LABEL[m.state].toLowerCase()})`)
    .join(" · ");

  return `# Status report — ${project.name}

**Cliente:** ${project.client} · **Fecha:** ${formatDate(s.today)} · **Período:** ${formatDate(s.periodStart)} al ${formatDate(s.today)}

## 1. Estado general

${HEALTH_EMOJI[health.level]} **${HEALTH_LABEL[health.level]}** — ${HEALTH_HEADLINE[health.level]}

${health.reasons.map((r) => `- ${r}`).join("\n")}

## 2. Avance y logros del período

**Avance: ${progress.pct}%** (${progress.done} de ${progress.total} tareas completadas). ${statusBreakdown}.

Hitos: ${milestoneLine}.

${list(achievements, "Sin logros registrados en el período.")}

## 3. Próximos pasos

${list(nextSteps, "Sin tareas con vencimiento en los próximos días.")}

## 4. Riesgos y bloqueos

${list(risks, "Sin riesgos ni bloqueos abiertos.")}

## 5. Decisiones o ayuda requerida

${list(decisions, "No se requieren decisiones en este momento.")}
`;
}
