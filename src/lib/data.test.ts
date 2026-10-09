import { describe, expect, it } from "vitest";
import rawData from "@/data/proyecto-demo.json";
import { getProjectData } from "./data";
import { addDays, daysBetween } from "./dates";
import { computeHealth, computeMetrics } from "./metrics";
import { parseTasks } from "./tasks";

const REF = rawData.referenceDate;
const OFFSETS = [-30, -1, 0, 1, 10, 45, 400];
const dayWith = (offset: number) => addDays(REF, offset);

const healthOn = (day: string) => {
  const data = getProjectData(day);
  return computeHealth(computeMetrics(data, day));
};

describe("demo data: date shifting", () => {
  it("is returned unchanged on the reference date", () => {
    const d = getProjectData(REF);
    expect(d.project.startDate).toBe(rawData.project.startDate);
    expect(d.tasks.map((t) => t.dueDate)).toEqual(rawData.tasks.map((t) => t.dueDate));
  });

  it("moves every date by the same number of days", () => {
    const offset = 10;
    const d = getProjectData(dayWith(offset));
    const shifted = (iso: string) => addDays(iso, offset);

    expect(d.project.startDate).toBe(shifted(rawData.project.startDate));
    expect(d.project.endDate).toBe(shifted(rawData.project.endDate));
    d.project.milestones.forEach((m, i) => expect(m.dueDate).toBe(shifted(rawData.project.milestones[i].dueDate)));
    d.tasks.forEach((t, i) => {
      expect(t.dueDate).toBe(shifted(rawData.tasks[i].dueDate));
      const raw = rawData.tasks[i] as { completedAt?: string };
      if (raw.completedAt) expect(t.completedAt).toBe(shifted(raw.completedAt));
      else expect("completedAt" in t).toBe(false);
    });
    d.actionItems.forEach((a, i) => {
      expect(a.dueDate).toBe(shifted(rawData.actionItems[i].dueDate));
      expect(a.meetingDate).toBe(shifted(rawData.actionItems[i].meetingDate));
    });
  });

  it("keeps the gaps between dates", () => {
    const d = getProjectData(dayWith(77));
    const raw = rawData.tasks[9];
    expect(daysBetween(d.tasks[9].dueDate, d.project.milestones[1].dueDate)).toBe(
      daysBetween(raw.dueDate, rawData.project.milestones[1].dueDate),
    );
  });

  it("does not change non-date fields", () => {
    const d = getProjectData(dayWith(5));
    expect(d.tasks.map((t) => [t.id, t.title, t.owner, t.status])).toEqual(
      rawData.tasks.map((t) => [t.id, t.title, t.owner, t.status]),
    );
    expect(d.findings).toEqual(rawData.findings);
  });
});

describe("demo data: the project is always yellow", () => {
  const baseline = healthOn(REF);

  it("is yellow on the reference date, with the three documented reasons", () => {
    expect(baseline.level).toBe("yellow");
    expect(baseline.reasons).toEqual([
      "19% de las tareas abiertas están vencidas (4 de 21)",
      "3 tareas bloqueadas",
      "2 pendientes de reunión vencidos",
    ]);
  });

  it.each(OFFSETS)("is identical when opened %i days from the reference date", (offset) => {
    expect(healthOn(dayWith(offset))).toEqual(baseline);
  });
});

describe("demo data: consistency", () => {
  const data = getProjectData(REF);
  const milestoneIds = data.project.milestones.map((m) => m.id);

  it("passes the same validation as user-entered tasks", () => {
    expect(parseTasks(data.tasks, milestoneIds)).not.toBeNull();
  });

  it("has a completion date in the past for every done task, and none for open ones", () => {
    for (const t of data.tasks) {
      if (t.status === "done") {
        expect(t.completedAt, t.title).toBeDefined();
        expect(t.completedAt! <= REF, t.title).toBe(true);
      } else {
        expect(t.completedAt, t.title).toBeUndefined();
      }
    }
  });

  it("gives every blocked task a reason", () => {
    for (const t of data.tasks.filter((t) => t.status === "blocked")) expect(t.blockedReason, t.title).toBeTruthy();
  });

  it("only references existing milestones", () => {
    for (const t of data.tasks) expect(milestoneIds).toContain(t.milestoneId);
  });
});
