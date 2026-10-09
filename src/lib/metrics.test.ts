import { describe, expect, it } from "vitest";
import { computeHealth, computeMetrics } from "./metrics";
import { actionItem, finding, milestone, projectData, task, TODAY } from "./test-helpers";
import type { Task } from "./types";

const metrics = (data = projectData()) => computeMetrics(data, TODAY);
const health = (data = projectData()) => computeHealth(metrics(data));

/** `open` open tasks of which `overdue` are overdue. */
const openTasks = (open: number, overdue: number): Task[] =>
  Array.from({ length: open }, (_, i) =>
    task({ status: "todo", dueDate: i < overdue ? "2026-10-01" : "2026-10-30" }),
  );

describe("computeMetrics: tasks", () => {
  it("returns zeros, not NaN, for a project with no tasks", () => {
    const m = metrics();
    expect(m.totalTasks).toBe(0);
    expect(m.progressPct).toBe(0);
    expect(m.overdueOpenPct).toBe(0);
    expect(m.tasksByStatus).toEqual({ todo: 0, in_progress: 0, blocked: 0, done: 0 });
  });

  it("counts tasks by status and rounds progress", () => {
    const m = metrics(
      projectData({
        tasks: [task({ status: "done" }), task({ status: "todo" }), task({ status: "in_progress" })],
      }),
    );
    expect(m.tasksByStatus).toEqual({ todo: 1, in_progress: 1, blocked: 0, done: 1 });
    expect(m.doneTasks).toBe(1);
    expect(m.openTasks).toBe(2);
    expect(m.progressPct).toBe(33);
    expect(metrics(projectData({ tasks: [task({ status: "done" }), task({ status: "done" }), task()] })).progressPct).toBe(67);
  });

  it("treats a task as overdue only if it is open and due before today", () => {
    const m = metrics(
      projectData({
        tasks: [
          task({ dueDate: "2026-10-08" }), // overdue
          task({ dueDate: "2026-10-09" }), // due today: not overdue
          task({ dueDate: "2026-10-01", status: "done" }), // done: never overdue
          task({ dueDate: "2026-10-08", status: "blocked" }), // blocked tasks can be overdue too
        ],
      }),
    );
    expect(m.overdueTasks).toHaveLength(2);
  });

  it("computes the overdue percentage over open tasks, not over all tasks", () => {
    const done = Array.from({ length: 6 }, () => task({ status: "done", dueDate: "2026-09-01" }));
    const m = metrics(projectData({ tasks: [...done, ...openTasks(4, 1)] }));
    expect(m.overdueOpenPct).toBe(25); // 1 of 4 open, not 1 of 10
  });

  it("lists blocked tasks", () => {
    const blocked = task({ status: "blocked", blockedReason: "x" });
    expect(metrics(projectData({ tasks: [blocked, task()] })).blockedTasks).toEqual([blocked]);
  });
});

describe("computeMetrics: action items and risks", () => {
  it("counts open and overdue action items", () => {
    const m = metrics(
      projectData({
        actionItems: [
          actionItem({ dueDate: "2026-10-08" }), // overdue
          actionItem({ dueDate: "2026-10-09" }), // due today
          actionItem({ dueDate: "2026-10-01", status: "done" }), // done
        ],
      }),
    );
    expect(m.openActionItems).toHaveLength(2);
    expect(m.overdueActionItems).toHaveLength(1);
  });

  it("counts only open risks, by impact", () => {
    const m = metrics(
      projectData({
        findings: [
          finding({ impact: "high" }),
          finding({ impact: "high" }),
          finding({ impact: "low" }),
          finding({ impact: "high", status: "mitigated" }),
          finding({ impact: "high", status: "closed" }),
          finding({ type: "finding", impact: "high" }),
          finding({ type: "requirement", impact: "medium" }),
        ],
      }),
    );
    expect(m.openRisks).toHaveLength(3);
    expect(m.openRisksByImpact).toEqual({ high: 2, medium: 0, low: 1 });
  });
});

describe("computeMetrics: milestones", () => {
  const withMilestones = (...milestones: ReturnType<typeof milestone>[]) => {
    const base = projectData();
    return projectData({ project: { ...base.project, milestones } });
  };

  it("picks the earliest pending milestone that is not past due as the next one", () => {
    const m = metrics(
      withMilestones(
        milestone({ id: "a", name: "Hecho", dueDate: "2026-10-12", status: "done" }),
        milestone({ id: "b", name: "Lejano", dueDate: "2026-10-20" }),
        milestone({ id: "c", name: "Cercano", dueDate: "2026-10-15" }),
        milestone({ id: "d", name: "Vencido", dueDate: "2026-10-01" }),
      ),
    );
    expect(m.nextMilestone?.milestone.name).toBe("Cercano");
    expect(m.nextMilestone?.daysLeft).toBe(6);
    expect(m.overdueMilestones.map((x) => x.name)).toEqual(["Vencido"]);
  });

  it("reports 0 days left for a milestone due today", () => {
    const m = metrics(withMilestones(milestone({ dueDate: TODAY })));
    expect(m.nextMilestone?.daysLeft).toBe(0);
    expect(m.overdueMilestones).toHaveLength(0);
  });

  it("has no next milestone when none is pending", () => {
    expect(metrics(withMilestones(milestone({ status: "done" }))).nextMilestone).toBeNull();
    expect(metrics(withMilestones()).nextMilestone).toBeNull();
  });

  it("derives each milestone's state and task counts, ordered by due date", () => {
    const m = metrics({
      ...withMilestones(
        milestone({ id: "m-done", dueDate: "2026-09-04", status: "done" }),
        milestone({ id: "m-late", dueDate: "2026-10-01" }),
        milestone({ id: "m-risk", dueDate: "2026-10-20" }),
        milestone({ id: "m-ok", dueDate: "2026-11-01" }),
      ),
      tasks: [
        task({ milestoneId: "m-done", status: "done" }),
        task({ milestoneId: "m-risk", dueDate: "2026-10-05" }), // overdue open task inside the milestone
        task({ milestoneId: "m-risk", status: "done" }),
        task({ milestoneId: "m-ok", dueDate: "2026-10-30" }),
      ],
    });
    expect(m.milestones.map((s) => [s.milestone.id, s.state, s.doneTasks, s.totalTasks])).toEqual([
      ["m-done", "done", 1, 1],
      ["m-late", "overdue", 0, 0],
      ["m-risk", "at_risk", 1, 2],
      ["m-ok", "on_track", 0, 1],
    ]);
  });
});

describe("computeHealth", () => {
  it("is green when nothing is wrong", () => {
    const h = health(projectData({ tasks: openTasks(5, 0) }));
    expect(h.level).toBe("green");
    expect(h.reasons).toHaveLength(1);
  });

  it("uses the overdue thresholds on open tasks: >10% yellow, >20% red", () => {
    expect(health(projectData({ tasks: openTasks(10, 1) })).level).toBe("green"); // 10% is not above 10
    const yellow = health(projectData({ tasks: openTasks(10, 2) })); // 20% is not above 20
    expect(yellow.level).toBe("yellow");
    expect(yellow.reasons[0]).toBe("20% de las tareas abiertas están vencidas (2 de 10)");
    expect(health(projectData({ tasks: openTasks(10, 3) })).level).toBe("red");
  });

  it("is yellow with a blocked task or an overdue action item", () => {
    expect(health(projectData({ tasks: [task({ status: "blocked", blockedReason: "x" })] })).level).toBe("yellow");
    expect(health(projectData({ actionItems: [actionItem({ dueDate: "2026-10-08" })] })).level).toBe("yellow");
  });

  it("is red with an overdue milestone", () => {
    const base = projectData();
    const h = health(projectData({ project: { ...base.project, milestones: [milestone({ name: "MVP", dueDate: "2026-10-01" })] } }));
    expect(h.level).toBe("red");
    expect(h.reasons).toEqual(["Hito vencido sin cumplir: MVP"]);
  });

  it("is red with an open high-impact risk, but not with a mitigated one or a non-risk", () => {
    expect(health(projectData({ findings: [finding({ impact: "high" })] })).level).toBe("red");
    expect(health(projectData({ findings: [finding({ impact: "high", status: "mitigated" })] })).level).toBe("green");
    expect(health(projectData({ findings: [finding({ type: "finding", impact: "high" })] })).level).toBe("green");
    expect(health(projectData({ findings: [finding({ impact: "medium" })] })).level).toBe("green");
  });

  it("lists red reasons before yellow ones", () => {
    const h = health(
      projectData({
        tasks: [task({ status: "blocked", blockedReason: "x" })],
        findings: [finding({ impact: "high" })],
      }),
    );
    expect(h.level).toBe("red");
    expect(h.reasons).toEqual(["1 riesgo de impacto alto abierto", "1 tarea bloqueada"]);
  });

  it("uses singular and plural forms", () => {
    const one = health(projectData({ tasks: [task({ status: "blocked", blockedReason: "x" })] }));
    expect(one.reasons).toContain("1 tarea bloqueada");
    const many = health(
      projectData({
        tasks: [task({ status: "blocked", blockedReason: "x" }), task({ status: "blocked", blockedReason: "y" })],
        actionItems: [actionItem({ dueDate: "2026-10-01" }), actionItem({ dueDate: "2026-10-02" })],
        findings: [finding({ impact: "high" }), finding({ impact: "high" })],
      }),
    );
    expect(many.reasons).toEqual([
      "2 riesgos de impacto alto abiertos",
      "2 tareas bloqueadas",
      "2 pendientes de reunión vencidos",
    ]);
  });
});
