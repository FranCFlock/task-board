import { describe, expect, it } from "vitest";
import { newTaskId, normalizeTask, parseTasks, TASK_LIMITS, validateTask, type TaskDraft } from "./tasks";
import { task, TODAY } from "./test-helpers";

const MILESTONES = ["m1", "m2"];

const draft = (o: Partial<TaskDraft> = {}): TaskDraft => ({
  title: "Armar el informe",
  owner: "Lisa Simpson",
  status: "todo",
  priority: "medium",
  dueDate: "2026-10-20",
  milestoneId: "m1",
  ...o,
});

describe("normalizeTask", () => {
  it("trims the title and the owner", () => {
    const t = normalizeTask(draft({ title: "  Hola  ", owner: "\tMarge  " }));
    expect(t.title).toBe("Hola");
    expect(t.owner).toBe("Marge");
  });

  it("keeps a trimmed blocked reason only when the task is blocked", () => {
    expect(normalizeTask(draft({ status: "blocked", blockedReason: "  falta firma " })).blockedReason).toBe("falta firma");
    expect(normalizeTask(draft({ status: "blocked" })).blockedReason).toBe("");
    expect("blockedReason" in normalizeTask(draft({ status: "in_progress", blockedReason: "x" }))).toBe(false);
  });

  it("keeps the completion date only when the task is done", () => {
    expect(normalizeTask(draft({ status: "done", completedAt: "2026-10-01" })).completedAt).toBe("2026-10-01");
    expect("completedAt" in normalizeTask(draft({ status: "todo", completedAt: "2026-10-01" }))).toBe(false);
    expect("completedAt" in normalizeTask(draft({ status: "done", completedAt: "" }))).toBe(false);
  });

  it("does not modify its input", () => {
    const input = draft({ title: " x ", status: "todo", blockedReason: "y" });
    normalizeTask(input);
    expect(input.title).toBe(" x ");
    expect(input.blockedReason).toBe("y");
  });
});

describe("validateTask", () => {
  it("accepts a valid task", () => {
    expect(validateTask(draft(), MILESTONES)).toEqual({});
  });

  it("requires a title and an owner, ignoring whitespace", () => {
    expect(validateTask(draft({ title: "   " }), MILESTONES).title).toBe("Ingresá un título.");
    expect(validateTask(draft({ owner: "" }), MILESTONES).owner).toBe("Ingresá un responsable.");
  });

  it("enforces the maximum lengths", () => {
    expect(validateTask(draft({ title: "x".repeat(TASK_LIMITS.title) }), MILESTONES).title).toBeUndefined();
    expect(validateTask(draft({ title: "x".repeat(TASK_LIMITS.title + 1) }), MILESTONES).title).toMatch(/Máximo 120/);
    expect(validateTask(draft({ owner: "x".repeat(TASK_LIMITS.owner + 1) }), MILESTONES).owner).toMatch(/Máximo 60/);
  });

  it("rejects invalid or impossible due dates", () => {
    for (const dueDate of ["", "abc", "2026-1-1", "2026-13-01", "2026-02-30", "2026-10-9", "20261009"]) {
      expect(validateTask(draft({ dueDate }), MILESTONES).dueDate, dueDate).toBe("Ingresá una fecha válida.");
    }
    expect(validateTask(draft({ dueDate: "2028-02-29" }), MILESTONES).dueDate).toBeUndefined(); // leap day
  });

  it("requires an existing milestone, a known status and a known priority", () => {
    expect(validateTask(draft({ milestoneId: "zzz" }), MILESTONES).milestoneId).toBe("Elegí un hito.");
    expect(validateTask(draft({ status: "nope" as TaskDraft["status"] }), MILESTONES).status).toBe("Elegí un estado.");
    expect(validateTask(draft({ priority: "nope" as TaskDraft["priority"] }), MILESTONES).priority).toBe("Elegí una prioridad.");
  });

  it("requires a reason when the task is blocked", () => {
    expect(validateTask(draft({ status: "blocked" }), MILESTONES).blockedReason).toBe("Contá por qué está bloqueada.");
    expect(validateTask(draft({ status: "blocked", blockedReason: "   " }), MILESTONES).blockedReason).toBeDefined();
    expect(validateTask(draft({ status: "blocked", blockedReason: "Falta acceso" }), MILESTONES)).toEqual({});
    expect(
      validateTask(draft({ status: "blocked", blockedReason: "x".repeat(TASK_LIMITS.blockedReason + 1) }), MILESTONES).blockedReason,
    ).toMatch(/Máximo 300/);
  });

  it("does not ask for a reason when the task is not blocked", () => {
    expect(validateTask(draft({ status: "todo", blockedReason: "" }), MILESTONES)).toEqual({});
  });

  describe("completion date", () => {
    const done = (completedAt?: string) => draft({ status: "done", completedAt });

    it("is required in the form (when `today` is given)", () => {
      expect(validateTask(done(), MILESTONES, TODAY).completedAt).toBe("Ingresá la fecha de cierre.");
    });

    it("is optional for stored data (older saved tasks have none)", () => {
      expect(validateTask(done(), MILESTONES)).toEqual({});
    });

    it("must be a real date", () => {
      expect(validateTask(done("2026-02-30"), MILESTONES).completedAt).toBe("Ingresá una fecha válida.");
      expect(validateTask(done("ayer"), MILESTONES, TODAY).completedAt).toBe("Ingresá una fecha válida.");
    });

    it("cannot be in the future, but today is fine", () => {
      expect(validateTask(done("2026-10-10"), MILESTONES, TODAY).completedAt).toBe("No puede ser una fecha futura.");
      expect(validateTask(done(TODAY), MILESTONES, TODAY)).toEqual({});
      expect(validateTask(done("2026-10-10"), MILESTONES)).toEqual({}); // no `today`: not checked
    });

    it("is ignored when the task is not done", () => {
      expect(validateTask(draft({ status: "todo", completedAt: "basura" }), MILESTONES, TODAY)).toEqual({});
    });
  });
});

describe("parseTasks", () => {
  const valid = () => ({ ...task({ id: "a" }) });

  it("returns normalized tasks for a valid list", () => {
    const result = parseTasks([{ ...valid(), title: "  Con espacios " }], MILESTONES);
    expect(result).toHaveLength(1);
    expect(result?.[0].title).toBe("Con espacios");
  });

  it("accepts an empty list", () => {
    expect(parseTasks([], MILESTONES)).toEqual([]);
  });

  it("rejects anything that is not an array", () => {
    for (const value of [null, undefined, "x", 5, {}, { tasks: [] }]) {
      expect(parseTasks(value, MILESTONES), String(value)).toBeNull();
    }
  });

  it("rejects lists with more than the maximum number of tasks", () => {
    const many = Array.from({ length: TASK_LIMITS.maxTasks + 1 }, (_, i) => ({ ...valid(), id: `t${i}` }));
    expect(parseTasks(many, MILESTONES)).toBeNull();
    expect(parseTasks(many.slice(0, TASK_LIMITS.maxTasks), MILESTONES)).toHaveLength(TASK_LIMITS.maxTasks);
  });

  it("rejects non-object items and items with missing or mistyped fields", () => {
    expect(parseTasks([null], MILESTONES)).toBeNull();
    expect(parseTasks(["x"], MILESTONES)).toBeNull();
    for (const field of ["id", "title", "owner", "status", "priority", "dueDate", "milestoneId"]) {
      const missing: Record<string, unknown> = { ...valid() };
      delete missing[field];
      expect(parseTasks([missing], MILESTONES), `missing ${field}`).toBeNull();
      expect(parseTasks([{ ...valid(), [field]: 42 }], MILESTONES), `number in ${field}`).toBeNull();
    }
    expect(parseTasks([{ ...valid(), blockedReason: 5 }], MILESTONES)).toBeNull();
    expect(parseTasks([{ ...valid(), completedAt: 5 }], MILESTONES)).toBeNull();
  });

  it("rejects duplicate or empty ids", () => {
    expect(parseTasks([valid(), valid()], MILESTONES)).toBeNull();
    expect(parseTasks([{ ...valid(), id: "" }], MILESTONES)).toBeNull();
  });

  it("rejects a list when any task fails validation", () => {
    expect(parseTasks([valid(), { ...task({ id: "b" }), milestoneId: "zzz" }], MILESTONES)).toBeNull();
    expect(parseTasks([{ ...valid(), dueDate: "2026-02-30" }], MILESTONES)).toBeNull();
    expect(parseTasks([{ ...valid(), status: "blocked" }], MILESTONES)).toBeNull(); // blocked without a reason
  });

  it("accepts done tasks without a completion date (older saved data)", () => {
    expect(parseTasks([{ ...valid(), status: "done" }], MILESTONES)).toHaveLength(1);
  });

  it("drops fields that do not apply to the status", () => {
    const [t] = parseTasks([{ ...valid(), status: "todo", blockedReason: "x", completedAt: "2026-10-01" }], MILESTONES) ?? [];
    expect(t).toBeDefined();
    expect("blockedReason" in t).toBe(false);
    expect("completedAt" in t).toBe(false);
  });
});

describe("newTaskId", () => {
  it("has the expected shape and is unique", () => {
    const ids = Array.from({ length: 200 }, newTaskId);
    expect(ids.every((id) => /^t-[0-9a-f]{8}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
