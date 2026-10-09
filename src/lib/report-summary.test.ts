import { describe, expect, it } from "vitest";
import { computeHealth, computeMetrics } from "./metrics";
import { buildReportSummary, PERIOD_DAYS, UPCOMING_DAYS } from "./report-summary";
import { actionItem, finding, milestone, projectData, task, TODAY } from "./test-helpers";
import type { ProjectData } from "./types";

// TODAY = 2026-10-09, so the period starts on 2026-09-25 and "upcoming" ends on 2026-10-16.
const summarize = (data: ProjectData) => {
  const m = computeMetrics(data, TODAY);
  return buildReportSummary(data, m, computeHealth(m));
};

describe("buildReportSummary", () => {
  it("defines the period as the last 14 days", () => {
    expect(PERIOD_DAYS).toBe(14);
    expect(UPCOMING_DAYS).toBe(7);
    const s = summarize(projectData());
    expect(s.today).toBe(TODAY);
    expect(s.periodStart).toBe("2026-09-25");
  });

  it("carries the project, the health and the progress through", () => {
    const data = projectData({ tasks: [task({ status: "done" }), task(), task({ status: "blocked", blockedReason: "x" })] });
    const s = summarize(data);
    expect(s.project).toMatchObject({ name: "Proyecto de prueba", client: "Cliente de prueba" });
    expect(s.health.level).toBe("yellow");
    expect(s.progress).toEqual({ pct: 33, done: 1, total: 3, byStatus: { todo: 1, in_progress: 0, blocked: 1, done: 1 } });
  });
});

describe("recentlyDone", () => {
  it("uses the real completion date, inclusive of the period start, and sorts by it", () => {
    const s = summarize(
      projectData({
        tasks: [
          task({ title: "A", status: "done", completedAt: "2026-10-01" }),
          task({ title: "B", status: "done", completedAt: "2026-09-25" }), // first day of the period
          task({ title: "C", status: "done", completedAt: "2026-09-24" }), // one day too early
          task({ title: "D", status: "done", completedAt: "2026-10-10" }), // in the future
          task({ title: "N", status: "todo", completedAt: "2026-10-01" }), // not done
        ],
      }),
    );
    expect(s.recentlyDone.map((t) => t.title)).toEqual(["B", "A"]);
    expect(s.recentlyDone[0].completedAt).toBe("2026-09-25");
  });

  it("falls back to the due date for done tasks without a completion date", () => {
    const s = summarize(
      projectData({
        tasks: [
          task({ title: "En período", status: "done", dueDate: "2026-10-03" }),
          task({ title: "Viejo", status: "done", dueDate: "2026-08-01" }),
        ],
      }),
    );
    expect(s.recentlyDone).toEqual([{ title: "En período", owner: "Lisa Simpson", completedAt: "2026-10-03" }]);
  });

  it("counts a task finished late by when it was finished, not when it was due", () => {
    const s = summarize(projectData({ tasks: [task({ title: "Tarde", status: "done", dueDate: "2026-09-10", completedAt: "2026-10-05" })] }));
    expect(s.recentlyDone.map((t) => t.title)).toEqual(["Tarde"]);
  });
});

describe("upcoming, overdue and blocked tasks", () => {
  it("lists open tasks due from today to 7 days ahead, soonest first", () => {
    const s = summarize(
      projectData({
        tasks: [
          task({ title: "límite", dueDate: "2026-10-16" }),
          task({ title: "hoy", dueDate: "2026-10-09", status: "in_progress" }),
          task({ title: "fuera", dueDate: "2026-10-17" }),
          task({ title: "vencida", dueDate: "2026-10-08" }),
          task({ title: "hecha", dueDate: "2026-10-10", status: "done" }),
        ],
      }),
    );
    expect(s.upcomingTasks.map((t) => t.title)).toEqual(["hoy", "límite"]);
    expect(s.upcomingTasks[0].status).toBe("in_progress");
  });

  it("reports how many days late each overdue task is, oldest first", () => {
    const s = summarize(
      projectData({
        tasks: [task({ title: "b", dueDate: "2026-10-08" }), task({ title: "a", dueDate: "2026-10-01" })],
      }),
    );
    expect(s.overdueTasks).toEqual([
      { title: "a", owner: "Lisa Simpson", dueDate: "2026-10-01", daysOverdue: 8 },
      { title: "b", owner: "Lisa Simpson", dueDate: "2026-10-08", daysOverdue: 1 },
    ]);
  });

  it("includes the blocking reason, with a fallback when there is none", () => {
    const s = summarize(
      projectData({
        tasks: [
          task({ title: "con motivo", status: "blocked", blockedReason: "Falta acceso", dueDate: "2026-10-12" }),
          task({ title: "sin motivo", status: "blocked", dueDate: "2026-10-11" }),
        ],
      }),
    );
    expect(s.blockedTasks.map((t) => [t.title, t.reason])).toEqual([
      ["sin motivo", "Sin motivo informado"],
      ["con motivo", "Falta acceso"],
    ]);
  });

  it("does not reorder the caller's data", () => {
    const data = projectData({ tasks: [task({ dueDate: "2026-10-08" }), task({ dueDate: "2026-10-01" })] });
    const before = data.tasks.map((t) => t.dueDate);
    summarize(data);
    expect(data.tasks.map((t) => t.dueDate)).toEqual(before);
  });
});

describe("action items, risks and findings", () => {
  it("flags overdue open action items, soonest first", () => {
    const s = summarize(
      projectData({
        actionItems: [
          actionItem({ description: "tarde", dueDate: "2026-10-20" }),
          actionItem({ description: "vencido", dueDate: "2026-10-02", sourceMeeting: "Comité #7" }),
          actionItem({ description: "hecho", dueDate: "2026-10-01", status: "done" }),
        ],
      }),
    );
    expect(s.openActionItems.map((a) => [a.description, a.overdue])).toEqual([
      ["vencido", true],
      ["tarde", false],
    ]);
    expect(s.openActionItems[0].meeting).toBe("Comité #7");
  });

  it("lists only action items closed since the start of the period", () => {
    const s = summarize(
      projectData({
        actionItems: [
          actionItem({ description: "reciente", status: "done", meetingDate: "2026-10-01" }),
          actionItem({ description: "borde", status: "done", meetingDate: "2026-09-25" }),
          actionItem({ description: "viejo", status: "done", meetingDate: "2026-09-24" }),
          actionItem({ description: "abierto", status: "open", meetingDate: "2026-10-01" }),
        ],
      }),
    );
    expect(s.closedActionItems.map((a) => a.description)).toEqual(["reciente", "borde"]);
  });

  it("orders open risks by impact and leaves out mitigated ones", () => {
    const s = summarize(
      projectData({
        findings: [
          finding({ description: "medio", impact: "medium" }),
          finding({ description: "alto", impact: "high" }),
          finding({ description: "bajo", impact: "low" }),
          finding({ description: "mitigado", impact: "high", status: "mitigated" }),
        ],
      }),
    );
    expect(s.openRisks.map((r) => r.description)).toEqual(["alto", "medio", "bajo"]);
  });

  it("lists open high-impact findings and requirements, but not risks", () => {
    const s = summarize(
      projectData({
        findings: [
          finding({ description: "hallazgo", type: "finding", impact: "high" }),
          finding({ description: "requerimiento", type: "requirement", impact: "high" }),
          finding({ description: "riesgo", type: "risk", impact: "high" }),
          finding({ description: "cerrado", type: "finding", impact: "high", status: "closed" }),
          finding({ description: "medio", type: "finding", impact: "medium" }),
        ],
      }),
    );
    expect(s.openHighImpactFindings.map((f) => f.description)).toEqual(["hallazgo", "requerimiento"]);
  });
});

describe("milestones", () => {
  it("includes the next milestone with its task counts, or null when none is left", () => {
    const base = projectData();
    const withNext: ProjectData = {
      ...base,
      project: { ...base.project, milestones: [milestone({ id: "m1", name: "MVP", dueDate: "2026-10-16" })] },
      tasks: [task({ milestoneId: "m1", status: "done" }), task({ milestoneId: "m1" })],
    };
    expect(summarize(withNext).nextMilestone).toEqual({ name: "MVP", dueDate: "2026-10-16", daysLeft: 7, done: 1, total: 2 });
    const none: ProjectData = { ...base, project: { ...base.project, milestones: [milestone({ status: "done" })] } };
    expect(summarize(none).nextMilestone).toBeNull();
  });

  it("lists every milestone with its state", () => {
    const base = projectData();
    const s = summarize({
      ...base,
      project: {
        ...base.project,
        milestones: [milestone({ name: "Cumplido", status: "done", dueDate: "2026-09-04" }), milestone({ name: "Vencido", dueDate: "2026-10-01" })],
      },
    });
    expect(s.milestones.map((m) => [m.name, m.state])).toEqual([
      ["Cumplido", "done"],
      ["Vencido", "overdue"],
    ]);
  });
});
