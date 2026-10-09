import rawData from "@/data/proyecto-demo.json";
import type { ISODate, ProjectData } from "./types";

/**
 * The demo JSON is written around `referenceDate`. On load, every date is shifted by
 * (today - referenceDate) so there are always overdue and upcoming items, whatever day it is.
 */
type RawProjectData = ProjectData & { referenceDate: ISODate };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToUTC(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((isoToUTC(to) - isoToUTC(from)) / DAY_MS);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return new Date(isoToUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function getProjectData(today: Date = new Date()): ProjectData {
  const { referenceDate, project, tasks, actionItems, findings } = rawData as RawProjectData;
  const offset = daysBetween(referenceDate, toISODate(today));
  const shift = (iso: ISODate) => addDays(iso, offset);

  return {
    project: {
      ...project,
      startDate: shift(project.startDate),
      endDate: shift(project.endDate),
      milestones: project.milestones.map((m) => ({ ...m, dueDate: shift(m.dueDate) })),
    },
    tasks: tasks.map((t) => ({ ...t, dueDate: shift(t.dueDate) })),
    actionItems: actionItems.map((a) => ({
      ...a,
      meetingDate: shift(a.meetingDate),
      dueDate: shift(a.dueDate),
    })),
    findings: findings.map((f) => ({ ...f })),
  };
}
