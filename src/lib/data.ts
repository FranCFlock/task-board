import rawData from "@/data/proyecto-demo.json";
import { addDays, daysBetween, toISODate } from "./dates";
import type { ISODate, ProjectData } from "./types";

/**
 * The demo JSON is written around `referenceDate`. On load, every date is shifted by
 * (today - referenceDate) so there are always overdue and upcoming items, whatever day it is.
 */
type RawProjectData = ProjectData & { referenceDate: ISODate };

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
