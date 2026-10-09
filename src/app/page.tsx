import ActionItemsList from "@/components/ActionItemsList";
import FindingsList from "@/components/FindingsList";
import HealthBadge from "@/components/HealthBadge";
import KpiCard, { ProgressCard } from "@/components/KpiCard";
import MilestonesCard from "@/components/MilestonesCard";
import ReportPanel from "@/components/ReportPanel";
import StatusChart from "@/components/StatusChart";
import Tabs, { type TabItem } from "@/components/Tabs";
import TasksTable from "@/components/TasksTable";
import { getProjectData } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/dates";
import { computeHealth, computeMetrics, type Metrics } from "@/lib/metrics";

// Dates are shifted relative to "today", so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

const TAB_IDS = ["resumen", "tareas", "pendientes", "relevamiento"] as const;
type TabId = (typeof TAB_IDS)[number];

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

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: TabId = TAB_IDS.find((id) => id === tab) ?? "resumen";

  const today = todayISO();
  const data = getProjectData(today);
  const { project } = data;
  const m = computeMetrics(data, today);
  const health = computeHealth(m);

  const tabs: TabItem[] = [
    { id: "resumen", label: "Resumen" },
    { id: "tareas", label: "Tareas", count: data.tasks.length },
    { id: "pendientes", label: "Pendientes", count: m.openActionItems.length },
    { id: "relevamiento", label: "Relevamiento", count: data.findings.length },
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
            <div className="mt-5">
              <ReportPanel today={m.today} />
            </div>
          </div>
          <div className="lg:w-96">
            <HealthBadge health={health} />
          </div>
        </div>
      </header>

      <Tabs tabs={tabs} active={active} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {active === "resumen" && <SummaryTab m={m} />}
        {active === "tareas" && (
          <TasksTable tasks={data.tasks} milestones={project.milestones} today={m.today} />
        )}
        {active === "pendientes" && <ActionItemsList items={data.actionItems} today={m.today} />}
        {active === "relevamiento" && <FindingsList findings={data.findings} />}
      </main>
    </>
  );
}
