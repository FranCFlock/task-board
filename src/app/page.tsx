import { getProjectData } from "@/lib/data";

// Dates are shifted relative to "today", so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

export default function Home() {
  const { project, tasks, actionItems, findings } = getProjectData();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <p className="text-slate-600">
        {project.client} · {project.startDate} → {project.endDate}
      </p>
      <p className="mt-4 text-sm text-slate-500">
        {tasks.length} tareas · {actionItems.length} pendientes · {findings.length} ítems relevados
      </p>
    </main>
  );
}
