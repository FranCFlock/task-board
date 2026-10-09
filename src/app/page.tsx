import Dashboard from "@/components/Dashboard";
import { TAB_IDS, type TabId } from "@/components/Tabs";
import { getProjectData } from "@/lib/data";
import { todayISO } from "@/lib/dates";

// Dates are shifted relative to "today", so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: TabId = TAB_IDS.find((id) => id === tab) ?? "resumen";

  const today = todayISO();
  return <Dashboard demo={getProjectData(today)} today={today} active={active} />;
}
