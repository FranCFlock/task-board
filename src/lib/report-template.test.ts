import { describe, expect, it } from "vitest";
import { formatDate } from "./dates";
import { renderTemplateReport } from "./report-template";
import type { ReportSummary } from "./report-summary";
import { TODAY } from "./test-helpers";

const summary = (o: Partial<ReportSummary> = {}): ReportSummary => ({
  project: { name: "Proyecto X", client: "Cliente Y", startDate: "2026-08-10", endDate: "2026-12-04" },
  today: TODAY,
  periodStart: "2026-09-25",
  health: { level: "green", reasons: ["Sin desvíos"] },
  progress: { pct: 50, done: 5, total: 10, byStatus: { todo: 2, in_progress: 2, blocked: 1, done: 5 } },
  milestones: [],
  nextMilestone: null,
  recentlyDone: [],
  closedActionItems: [],
  upcomingTasks: [],
  blockedTasks: [],
  overdueTasks: [],
  openActionItems: [],
  openRisks: [],
  openHighImpactFindings: [],
  ...o,
});

const overdue = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ title: `Atrasada ${i + 1}`, owner: "Lisa", dueDate: "2026-10-01", daysOverdue: 8 }));

describe("renderTemplateReport: structure", () => {
  it("has the title, the header line and the five sections in order", () => {
    const md = renderTemplateReport(summary());
    expect(md.startsWith("# Status report — Proyecto X\n")).toBe(true);
    expect(md).toContain(`**Cliente:** Cliente Y · **Fecha:** ${formatDate(TODAY)} · **Período:** ${formatDate("2026-09-25")} al ${formatDate(TODAY)}`);

    const headings = ["## 1. Estado general", "## 2. Avance y logros del período", "## 3. Próximos pasos", "## 4. Riesgos y bloqueos", "## 5. Decisiones o ayuda requerida"];
    const positions = headings.map((h) => md.indexOf(h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("states the traffic light with its emoji, label and reasons", () => {
    const levels = [
      ["green", "🟢 **Verde**"],
      ["yellow", "🟡 **Amarillo**"],
      ["red", "🔴 **Rojo**"],
    ] as const;
    for (const [level, label] of levels) {
      const md = renderTemplateReport(summary({ health: { level, reasons: ["Motivo A", "Motivo B"] } }));
      expect(md, level).toContain(label);
      expect(md).toContain("- Motivo A\n- Motivo B");
    }
  });

  it("shows progress, the breakdown by status and the milestone states", () => {
    const md = renderTemplateReport(
      summary({
        milestones: [
          { name: "Diseño", dueDate: "2026-09-04", state: "done", done: 5, total: 5 },
          { name: "MVP", dueDate: "2026-10-16", state: "at_risk", done: 1, total: 4 },
        ],
      }),
    );
    expect(md).toContain("**Avance: 50%** (5 de 10 tareas completadas). Pendiente: 2 · En progreso: 2 · Bloqueada: 1 · Completada: 5.");
    expect(md).toContain("Hitos: Diseño (cumplido) · MVP (en riesgo).");
    expect(md).toContain("Hito cumplido: **Diseño**");
  });
});

describe("renderTemplateReport: empty states", () => {
  it("says so when there is nothing to report", () => {
    const md = renderTemplateReport(summary());
    expect(md).toContain("- Sin logros registrados en el período.");
    expect(md).toContain("- Sin tareas con vencimiento en los próximos días.");
    expect(md).toContain("- Sin riesgos ni bloqueos abiertos.");
    expect(md).toContain("- No se requieren decisiones en este momento.");
  });
});

describe("renderTemplateReport: content", () => {
  it("lists achievements with their real completion dates", () => {
    const md = renderTemplateReport(
      summary({
        recentlyDone: [{ title: "Pipeline", owner: "Carl", completedAt: "2026-10-01" }],
        closedActionItems: [{ description: "Enviar minuta", owner: "Lisa" }],
      }),
    );
    expect(md).toContain(`- Completada el ${formatDate("2026-10-01")}: Pipeline (Carl)`);
    expect(md).toContain("- Pendiente cerrado: Enviar minuta (Lisa)");
  });

  it("describes the next milestone and the upcoming tasks", () => {
    const md = renderTemplateReport(
      summary({
        nextMilestone: { name: "MVP", dueDate: "2026-10-16", daysLeft: 7, done: 4, total: 13 },
        upcomingTasks: [{ title: "Home", owner: "Marge", dueDate: "2026-10-12", status: "in_progress" }],
      }),
    );
    expect(md).toContain(`- Próximo hito: **MVP**, vence el ${formatDate("2026-10-16")} (faltan 7 días; 4/13 tareas completas)`);
    expect(md).toContain(`- Home — Marge, vence el ${formatDate("2026-10-12")}`);
  });

  it("uses the singular for one day", () => {
    const md = renderTemplateReport(
      summary({
        nextMilestone: { name: "MVP", dueDate: "2026-10-10", daysLeft: 1, done: 0, total: 1 },
        overdueTasks: [{ title: "Ayer", owner: "Lisa", dueDate: "2026-10-08", daysOverdue: 1 }],
      }),
    );
    expect(md).toContain("faltan 1 día;");
    expect(md).toContain("**Vencida hace 1 día:** Ayer");
  });

  it("lists blocked tasks as blockers and as something to unblock", () => {
    const md = renderTemplateReport(
      summary({ blockedTasks: [{ title: "SSO", owner: "Homero", reason: "Faltan credenciales", dueDate: "2026-10-03" }] }),
    );
    expect(md).toContain("- **Bloqueada:** SSO (Homero). Motivo: Faltan credenciales");
    expect(md).toContain('- Destrabar "SSO": Faltan credenciales');
  });

  it("does not repeat a blocked task as overdue", () => {
    const md = renderTemplateReport(
      summary({
        blockedTasks: [{ title: "SSO", owner: "Homero", reason: "x", dueDate: "2026-10-03" }],
        overdueTasks: [
          { title: "SSO", owner: "Homero", dueDate: "2026-10-03", daysOverdue: 6 },
          { title: "Otra", owner: "Lisa", dueDate: "2026-10-05", daysOverdue: 4 },
        ],
      }),
    );
    expect(md).not.toContain("Vencida hace 6 días");
    expect(md).toContain("**Vencida hace 4 días:** Otra (Lisa)");
  });

  it("describes risks by impact and asks for decisions on overdue action items and high-impact findings", () => {
    const md = renderTemplateReport(
      summary({
        openRisks: [
          { description: "Rotación de QA", impact: "low", owner: "Ned" },
          { description: "Sin dueño", impact: "high" },
        ],
        openActionItems: [
          { description: "Definir política", owner: "Lisa", dueDate: "2026-10-02", overdue: true, meeting: "Comité" },
          { description: "A tiempo", owner: "Lisa", dueDate: "2026-10-20", overdue: false, meeting: "Comité" },
        ],
        openHighImpactFindings: [{ description: "Reglas solo en código", type: "finding" }],
      }),
    );
    expect(md).toContain("- **Riesgo bajo:** Rotación de QA (Ned)");
    expect(md).toContain("- **Riesgo alto:** Sin dueño\n");
    expect(md).toContain(`- Cerrar pendiente vencido: Definir política (Lisa, vencía el ${formatDate("2026-10-02")})`);
    expect(md).not.toContain("A tiempo");
    expect(md).toContain("- Definir tratamiento de: Reglas solo en código");
  });
});

describe("renderTemplateReport: keeping it to one page", () => {
  const overdueLines = (md: string) => md.split("\n").filter((l) => l.includes("Vencida hace"));

  it("shows up to 3 items per group plus a summary line when more than 4 would not fit", () => {
    const md = renderTemplateReport(summary({ overdueTasks: overdue(6) }));
    expect(overdueLines(md)).toHaveLength(3);
    expect(md).toContain("- … y 3 tareas vencidas más");
  });

  it("shows all 4 when only one would be hidden (a summary line would not save space)", () => {
    const md = renderTemplateReport(summary({ overdueTasks: overdue(4) }));
    expect(overdueLines(md)).toHaveLength(4);
    expect(md).not.toContain("… y");
  });

  it("summarizes from 5 items on", () => {
    const md = renderTemplateReport(summary({ overdueTasks: overdue(5) }));
    expect(overdueLines(md)).toHaveLength(3);
    expect(md).toContain("- … y 2 tareas vencidas más");
  });

  it("allows 5 upcoming tasks before summarizing", () => {
    const upcoming = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ title: `Próxima ${i + 1}`, owner: "Lisa", dueDate: "2026-10-12", status: "todo" as const }));
    expect(renderTemplateReport(summary({ upcomingTasks: upcoming(6) }))).not.toContain("… y");
    const md = renderTemplateReport(summary({ upcomingTasks: upcoming(7) }));
    expect(md).toContain("- … y 2 tareas más esta semana");
  });

  it("never caps blocked tasks: each blocker is important", () => {
    const blocked = Array.from({ length: 6 }, (_, i) => ({ title: `Bloq ${i + 1}`, owner: "Lisa", reason: "r", dueDate: "2026-10-03" }));
    const md = renderTemplateReport(summary({ blockedTasks: blocked }));
    expect(md.match(/\*\*Bloqueada:\*\*/g)).toHaveLength(6);
  });
});
