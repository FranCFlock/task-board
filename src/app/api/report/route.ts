import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProjectData } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { computeHealth, computeMetrics } from "@/lib/metrics";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { REPORT_SYSTEM_PROMPT, buildReportUserPrompt } from "@/lib/report-prompt";
import { buildReportSummary, type ReportSummary } from "@/lib/report-summary";
import { renderTemplateReport } from "@/lib/report-template";
import { parseTasks } from "@/lib/tasks";
import type { ReportResponse, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-sonnet-5-5";
const AI_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 200_000; // 300 tasks of max-length text is well under this

// Each AI report costs real money, so AI calls are limited per IP and overall. Over the limit,
// the report still works: it is generated from the template (free) instead.
const intFromEnv = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
const aiRateLimit = createRateLimiter(
  { limit: intFromEnv("REPORT_AI_LIMIT_PER_IP", 6), windowMs: 10 * 60_000 },
  { limit: intFromEnv("REPORT_AI_LIMIT_GLOBAL", 60), windowMs: 60 * 60_000 },
);

/** Returns the report Markdown, or null if the model declined or returned nothing usable. */
async function generateAiReport(summary: ReportSummary, apiKey: string): Promise<string | null> {
  const client = new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 0 });

  const response = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 16000,
    // Short, well-specified task: low effort keeps it fast (target < 10 s).
    output_config: { effort: "low" },
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: REPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildReportUserPrompt(summary) }],
  });

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;

  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  return text || null;
}

/** Optional body: { tasks } with this browser's edited task list. Without it, the demo tasks are used. */
async function readTasks(request: Request, milestoneIds: string[]): Promise<Task[] | null | "invalid"> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("tasks" in body)) return null;
  return parseTasks(body.tasks, milestoneIds) ?? "invalid";
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "El pedido es demasiado grande." }, { status: 413 });
  }

  const today = todayISO();
  const demo = getProjectData(today);
  const tasks = await readTasks(request, demo.project.milestones.map((m) => m.id));
  if (tasks === "invalid") {
    return NextResponse.json({ error: "La lista de tareas no es válida." }, { status: 400 });
  }
  const data = tasks ? { ...demo, tasks } : demo;
  const metrics = computeMetrics(data, today);
  const summary = buildReportSummary(data, metrics, computeHealth(metrics));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let limited = false;
  if (apiKey) {
    const rate = aiRateLimit(clientIp(request.headers));
    limited = !rate.allowed;
    if (!rate.allowed) {
      console.warn(`[report] AI rate limit reached (retry in ${rate.retryAfterSec} s); using template`);
    }
  }

  if (apiKey && !limited) {
    try {
      const markdown = await generateAiReport(summary, apiKey);
      if (markdown) return NextResponse.json<ReportResponse>({ markdown, source: "ai" });
      console.warn("[report] AI returned no usable report; using template");
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        console.warn(`[report] AI timed out after ${AI_TIMEOUT_MS} ms; using template`);
      } else if (error instanceof Anthropic.AuthenticationError) {
        console.error("[report] Invalid ANTHROPIC_API_KEY; using template");
      } else if (error instanceof Anthropic.APIError) {
        console.error(`[report] AI error ${error.status}: ${error.message}; using template`);
      } else {
        console.error("[report] Unexpected error; using template", error);
      }
    }
  }

  return NextResponse.json<ReportResponse>({
    markdown: renderTemplateReport(summary),
    source: "template",
    ...(limited && { limited: true }),
  });
}
