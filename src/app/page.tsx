import HealthBadge from "@/components/HealthBadge";
import KpiCard, { ProgressCard } from "@/components/KpiCard";
import MilestonesCard from "@/components/MilestonesCard";
import StatusChart from "@/components/StatusChart";
import { getProjectData } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { computeHealth, computeMetrics } from "@/lib/metrics";

// Dates are shifted relative to "today", so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

export default function Home() {
  const data = getProjectData();
  const { project } = data;
  const m = computeMetrics(data);
  const health = computeHealth(m);
  const risks = m.openRisksByImpact;

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
          </div>
          <div className="lg:w-96">
            <HealthBadge health={health} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <h2 className="t-section text-brand-dark">Resumen</h2>

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
      </main>
    </>
  );
}
