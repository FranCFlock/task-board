import { NextResponse } from "next/server";
import { getProjectData } from "@/lib/data";
import { computeHealth, computeMetrics } from "@/lib/metrics";
import { buildReportSummary } from "@/lib/report-summary";
import { renderTemplateReport } from "@/lib/report-template";
import type { ReportResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const data = getProjectData();
  const metrics = computeMetrics(data);
  const summary = buildReportSummary(data, metrics, computeHealth(metrics));

  // Step 6 adds the LLM call here; the template is the fallback when there is no key or it fails.
  const body: ReportResponse = { markdown: renderTemplateReport(summary), source: "template" };
  return NextResponse.json(body);
}
