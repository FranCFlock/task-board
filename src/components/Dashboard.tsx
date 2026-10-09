"use client";

import { useCallback, useMemo, useState } from "react";
import ActionItemsList from "@/components/ActionItemsList";
import FindingsList from "@/components/FindingsList";
import HealthBadge from "@/components/HealthBadge";
import KpiCard, { ProgressCard } from "@/components/KpiCard";
import MilestonesCard from "@/components/MilestonesCard";
import { ConfirmDialog } from "@/components/Modal";
import ReportPanel from "@/components/ReportPanel";
import StatusChart from "@/components/StatusChart";
import Tabs, { type TabId, type TabItem } from "@/components/Tabs";
import TaskForm from "@/components/TaskForm";
import TasksTable from "@/components/TasksTable";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { ghostButton } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { computeHealth, computeMetrics, type Metrics } from "@/lib/metrics";
import type { TaskDraft } from "@/lib/tasks";
import type { ISODate, ProjectData, Task } from "@/lib/types";
import { useTasks } from "@/lib/use-tasks";

/** Open task dialog: the form (new or edit) or the delete confirmation. */
type TaskDialog = { kind: "form"; task: Task | null } | { kind: "delete"; task: Task } | null;

function SummaryTab({ m }: { m: Metrics }) {
  const risks = m.openRisksByImpact;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <ProgressCard pct={m.progressPct} done={m.doneTasks} total={m.totalTasks} />
        </div>
        <KpiCard
          label="Tareas vencidas"
          value={m.overdueTasks.length}
          detail={`${m.overdueOpenPct}% de las ${m.openTasks} abiertas`}
          dotColor="var(--accent)"
        />
        <KpiCard
          label="Bloqueadas"
          value={m.blockedTasks.length}
          detail="Necesitan destrabarse"
          dotColor="var(--state-blocked-bar)"
        />
        <KpiCard
          label="Pendientes abiertos"
          value={m.openActionItems.length}
          detail={`${m.overdueActionItems.length} vencidos`}
          dotColor="var(--state-in-progress-bar)"
        />
        <KpiCard
          label="Riesgos abiertos"
          value={m.openRisks.length}
          detail={`${risks.high} alto · ${risks.medium} medio · ${risks.low} bajo`}
          dotColor="var(--state-pending-bar)"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatusChart tasksByStatus={m.tasksByStatus} />
        </div>
        <MilestonesCard milestones={m.milestones} next={m.nextMilestone} />
      </div>
    </div>
  );
}

/**
 * Client side of the dashboard: holds the editable task list and recomputes metrics and
 * health on every change. Everything else comes from the server-rendered demo data.
 */
export default function Dashboard({ demo, today, active }: { demo: ProjectData; today: ISODate; active: TabId }) {
  const { project, actionItems, findings } = demo;
  const milestoneIds = useMemo(() => project.milestones.map((m) => m.id), [project.milestones]);
  const { tasks, edited, create, update, remove, reset } = useTasks(demo.tasks, milestoneIds);
  const [dialog, setDialog] = useState<TaskDialog>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const { show: showToast, toast } = useToast();

  const data = useMemo<ProjectData>(() => ({ project, tasks, actionItems, findings }), [project, tasks, actionItems, findings]);
  const m = useMemo(() => computeMetrics(data, today), [data, today]);
  const health = useMemo(() => computeHealth(m), [m]);
  const owners = useMemo(() => [...new Set(tasks.map((t) => t.owner))].sort(), [tasks]);

  const closeDialog = useCallback(() => setDialog(null), []);

  const saveTask = (draft: TaskDraft) => {
    if (dialog?.kind !== "form") return;
    if (dialog.task) {
      update(dialog.task.id, draft);
      showToast("Tarea actualizada");
    } else {
      create(draft);
      showToast("Tarea creada");
    }
    setDialog(null);
  };

  const deleteTask = () => {
    if (dialog?.kind !== "delete") return;
    remove(dialog.task.id);
    showToast("Tarea eliminada");
    setDialog(null);
  };

  const tabs: TabItem[] = [
    { id: "resumen", label: "Resumen" },
    { id: "tareas", label: "Tareas", count: tasks.length },
    { id: "pendientes", label: "Pendientes", count: m.openActionItems.length },
    { id: "relevamiento", label: "Relevamiento", count: findings.length },
  ];

  return (
    <>
      <header className="text-white" style={{ background: "var(--brand-gradient)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="t-caption text-white/80">Status del proyecto</div>
            <h1 className="t-display mt-1">{project.name}</h1>
            <p className="mt-2 text-[12.5px] font-medium text-white/80">
              {project.client} · {formatDate(project.startDate)} – {formatDate(project.endDate)}
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-white/80">Actualizado al {formatDate(m.today)}</p>
            <div className="mt-5 flex items-center gap-2">
              <ReportPanel today={m.today} tasks={tasks} />
              <ThemeToggle />
            </div>
          </div>
          <div className="lg:w-96">
            <HealthBadge health={health} />
          </div>
        </div>
      </header>

      <Tabs tabs={tabs} active={active} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {edited && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-line bg-panel px-4 py-3 shadow-card">
            <span className="size-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
            <p className="flex-1 text-[13px]">
              <span className="font-semibold">Estás viendo tareas editadas.</span>{" "}
              <span className="text-ink-soft">Los cambios se guardan solo en este navegador.</span>
            </p>
            <button type="button" onClick={() => setConfirmReset(true)} className={ghostButton}>
              Restablecer datos de demo
            </button>
          </div>
        )}

        {active === "resumen" && <SummaryTab m={m} />}
        {active === "tareas" && (
          <TasksTable
            tasks={tasks}
            milestones={project.milestones}
            today={m.today}
            onNew={() => setDialog({ kind: "form", task: null })}
            onEdit={(task) => setDialog({ kind: "form", task })}
            onDelete={(task) => setDialog({ kind: "delete", task })}
          />
        )}
        {active === "pendientes" && <ActionItemsList items={actionItems} today={m.today} />}
        {active === "relevamiento" && <FindingsList findings={findings} />}
      </main>

      {dialog?.kind === "form" && (
        <TaskForm
          task={dialog.task}
          milestones={project.milestones}
          owners={owners}
          today={today}
          onSave={saveTask}
          onClose={closeDialog}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Eliminar tarea"
        message={
          dialog?.kind === "delete" && (
            <p>
              ¿Eliminar <strong className="text-heading">{dialog.task.title}</strong>? Esta acción no se puede deshacer
              (salvo restableciendo los datos de demo).
            </p>
          )
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={deleteTask}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Restablecer datos de demo"
        message={<p>Se descartan todos los cambios hechos en este navegador y se vuelve a las tareas de demo.</p>}
        confirmLabel="Restablecer"
        danger
        onConfirm={() => {
          reset();
          setConfirmReset(false);
          showToast("Datos de demo restablecidos");
        }}
        onCancel={() => setConfirmReset(false)}
      />
      {toast}
    </>
  );
}
