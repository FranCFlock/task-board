import { getProjectData } from "@/lib/data";
import { computeHealth, computeMetrics } from "@/lib/metrics";

// Dates are shifted relative to "today", so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

export default function Home() {
  const data = getProjectData();
  const { project } = data;
  const metrics = computeMetrics(data);
  const health = computeHealth(metrics);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <p className="text-slate-600">
        {project.client} · {project.startDate} → {project.endDate}
      </p>
      <p className="mt-4 font-medium" data-health={health.level}>
        Salud: {health.level}
      </p>
      <ul className="list-disc pl-6 text-sm">
        {health.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <pre className="mt-4 text-xs text-slate-500">
        {JSON.stringify(
          {
            progressPct: metrics.progressPct,
            tasksByStatus: metrics.tasksByStatus,
            overdueTasks: metrics.overdueTasks.length,
            openActionItems: metrics.openActionItems.length,
            overdueActionItems: metrics.overdueActionItems.length,
            openRisksByImpact: metrics.openRisksByImpact,
            nextMilestone: metrics.nextMilestone,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
