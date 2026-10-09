"use client";

import { useId, useState } from "react";
import Modal from "@/components/Modal";
import { fieldLabel, ghostButton, inputClass, primaryButton } from "@/components/ui";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/lib/labels";
import { TASK_LIMITS, validateTask, type TaskDraft, type TaskErrors } from "@/lib/tasks";
import type { ISODate, Milestone, Priority, Task, TaskStatus } from "@/lib/types";

const PRIORITIES: Priority[] = ["high", "medium", "low"];

interface TaskFormProps {
  /** Task being edited, or null to create a new one. */
  task: Task | null;
  milestones: Milestone[];
  owners: string[];
  today: ISODate;
  onSave: (draft: TaskDraft) => void;
  onClose: () => void;
}

function emptyDraft(milestones: Milestone[], today: ISODate): TaskDraft {
  const firstPending = milestones.find((m) => m.status === "pending") ?? milestones[0];
  return {
    title: "",
    owner: "",
    status: "todo",
    priority: "medium",
    dueDate: today,
    milestoneId: firstPending?.id ?? "",
  };
}

/** Create / edit form. Mount it only while open so each opening starts from a fresh draft. */
export default function TaskForm({ task, milestones, owners, today, onSave, onClose }: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => {
    if (!task) return emptyDraft(milestones, today);
    const rest: Partial<Task> = { ...task };
    delete rest.id;
    return rest as TaskDraft;
  });
  const [errors, setErrors] = useState<TaskErrors>({});
  const ownersListId = useId();

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateTask(draft, milestones.map((m) => m.id));
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSave(draft);
  };

  const formId = useId();

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? "Editar tarea" : "Nueva tarea"}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={primaryButton}>
            {task ? "Guardar cambios" : "Crear tarea"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-[15px] sm:grid-cols-2">
        <Field label="Título" error={errors.title} className="sm:col-span-2">
          <input
            className={inputClass}
            value={draft.title}
            maxLength={TASK_LIMITS.title}
            onChange={(e) => set("title", e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Responsable" error={errors.owner}>
          <input
            className={inputClass}
            value={draft.owner}
            maxLength={TASK_LIMITS.owner}
            list={ownersListId}
            placeholder="Elegí o escribí un nombre"
            onChange={(e) => set("owner", e.target.value)}
          />
          <datalist id={ownersListId}>
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>

        <Field label="Vence" error={errors.dueDate}>
          <input type="date" className={inputClass} value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>

        <Field label="Estado" error={errors.status}>
          <select className={inputClass} value={draft.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
            {TASK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Prioridad" error={errors.priority}>
          <select className={inputClass} value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Hito" error={errors.milestoneId} className="sm:col-span-2">
          <select className={inputClass} value={draft.milestoneId} onChange={(e) => set("milestoneId", e.target.value)}>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        {draft.status === "blocked" && (
          <Field label="Motivo del bloqueo" error={errors.blockedReason} className="sm:col-span-2">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={draft.blockedReason ?? ""}
              maxLength={TASK_LIMITS.blockedReason}
              placeholder="¿Qué falta para destrabarla?"
              onChange={(e) => set("blockedReason", e.target.value)}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-[6px] ${className}`}>
      <span className={fieldLabel}>{label}</span>
      {children}
      {error && (
        <span className="text-[12.5px] font-medium" style={{ color: "var(--state-blocked-fg)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
