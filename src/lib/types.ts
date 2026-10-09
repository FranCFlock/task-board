/** ISO date string: YYYY-MM-DD */
export type ISODate = string;

export type MilestoneStatus = "pending" | "done";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type Priority = "low" | "medium" | "high";
export type ActionItemStatus = "open" | "done";
export type FindingType = "requirement" | "finding" | "risk";
export type Impact = "low" | "medium" | "high";
export type FindingStatus = "open" | "mitigated" | "closed";

export interface Milestone {
  id: string;
  name: string;
  dueDate: ISODate;
  status: MilestoneStatus;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: ISODate;
  endDate: ISODate;
  milestones: Milestone[];
}

export interface Task {
  id: string;
  title: string;
  owner: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: ISODate;
  milestoneId: string;
  blockedReason?: string;
  /** Day the task was finished. Only for status "done"; older saved tasks may not have it. */
  completedAt?: ISODate;
}

/** Pending item that came out of a meeting. */
export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  sourceMeeting: string;
  meetingDate: ISODate;
  dueDate: ISODate;
  status: ActionItemStatus;
}

/** Surveyed item: requirement, finding or risk. */
export interface Finding {
  id: string;
  type: FindingType;
  description: string;
  impact: Impact;
  status: FindingStatus;
  owner?: string;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  actionItems: ActionItem[];
  findings: Finding[];
}

/** Response of POST /api/report. */
export interface ReportResponse {
  markdown: string;
  source: "ai" | "template";
  /** True when the AI report was skipped because the usage limit was reached. */
  limited?: boolean;
}
