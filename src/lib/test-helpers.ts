// Small builders shared by the unit tests. Not imported by the app.
import type { ActionItem, Finding, Milestone, ProjectData, Task } from "./types";

/** Fixed "today" so every date in a test is relative to a known day. */
export const TODAY = "2026-10-09";

let counter = 0;
const nextId = (prefix: string) => `${prefix}${++counter}`;

export const task = (o: Partial<Task> = {}): Task => ({
  id: nextId("t"),
  title: "Tarea",
  owner: "Lisa Simpson",
  status: "todo",
  priority: "medium",
  dueDate: "2026-10-20",
  milestoneId: "m1",
  ...o,
});

export const milestone = (o: Partial<Milestone> = {}): Milestone => ({
  id: nextId("m"),
  name: "Hito",
  dueDate: "2026-11-01",
  status: "pending",
  ...o,
});

export const actionItem = (o: Partial<ActionItem> = {}): ActionItem => ({
  id: nextId("a"),
  description: "Pendiente",
  owner: "Homero Simpson",
  sourceMeeting: "Comité #1",
  meetingDate: "2026-10-01",
  dueDate: "2026-10-20",
  status: "open",
  ...o,
});

export const finding = (o: Partial<Finding> = {}): Finding => ({
  id: nextId("f"),
  type: "risk",
  description: "Riesgo",
  impact: "medium",
  status: "open",
  ...o,
});

export const projectData = (o: Partial<ProjectData> = {}): ProjectData => ({
  project: {
    id: "p1",
    name: "Proyecto de prueba",
    client: "Cliente de prueba",
    startDate: "2026-08-10",
    endDate: "2026-12-04",
    milestones: [milestone({ id: "m1" })],
  },
  tasks: [],
  actionItems: [],
  findings: [],
  ...o,
});
