"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { ghostButton, primaryButton } from "@/components/ui";
import type { ISODate, ReportResponse, Task } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; report: ReportResponse; ms: number }
  | { status: "error" };

// Markdown styled with design-system tokens (no typography plugin).
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="t-section mb-1 text-heading">{children}</h1>,
  h2: ({ children }) => <h2 className="t-card-title mb-2 mt-6 text-heading">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 font-bold text-heading">{children}</h3>,
  p: ({ children }) => <p className="my-2">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand-2">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-brand-2">{children}</ol>,
  strong: ({ children }) => <strong className="font-bold text-heading">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-brand-text underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="t-caption border-b-2 border-line-strong bg-surface px-3 py-2 text-left text-ink-faint">{children}</th>
  ),
  td: ({ children }) => <td className="border-t border-line px-3 py-2">{children}</td>,
  code: ({ children }) => <code className="text-mono rounded-[8px] bg-surface px-1">{children}</code>,
};

/**
 * "Generar reporte" button + panel. Sends the current tasks (which may include this
 * browser's edits) so the report matches what the dashboard shows.
 */
export default function ReportPanel({ today, tasks }: { today: ISODate; tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const { show: showToast, toast } = useToast();
  // Tasks the current report was generated from; a different list means the report is stale.
  const reportedTasks = useRef<Task[] | null>(null);

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    reportedTasks.current = tasks;
    const start = performance.now();
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const report = (await res.json()) as ReportResponse;
      setState({ status: "done", report, ms: performance.now() - start });
    } catch {
      setState({ status: "error" });
    }
  }, [tasks]);

  const openPanel = () => {
    setOpen(true);
    if (state.status !== "done" || reportedTasks.current !== tasks) void generate();
  };
  const close = useCallback(() => setOpen(false), []);

  const markdown = state.status === "done" ? state.report.markdown : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast("Reporte copiado al portapapeles");
    } catch {
      showToast("No se pudo copiar");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-report-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Descargando status-report.md");
  };

  // Print styles in globals.css leave only the report visible; the title becomes the PDF file name.
  const print = () => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousTitle = document.title;
    root.classList.remove("dark"); // paper is white: always print with the light theme
    document.title = `status-report-${today}`;
    window.print();
    document.title = previousTitle;
    if (wasDark) root.classList.add("dark");
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex items-center gap-[7px] rounded-[9px] bg-white px-4 py-[9px] text-[13px] font-semibold text-brand shadow-card transition-colors hover:bg-brand-soft active:translate-y-px"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
        Generar reporte
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Status report"
        size="lg"
        overlayClassName="print-root"
        headerExtra={state.status === "done" && <SourceBadge report={state.report} ms={state.ms} />}
        footer={
          <>
            <button type="button" onClick={generate} disabled={state.status === "loading"} className={ghostButton}>
              Regenerar
            </button>
            <button type="button" onClick={copy} disabled={state.status !== "done"} className={ghostButton}>
              Copiar
            </button>
            <button
              type="button"
              onClick={print}
              disabled={state.status !== "done"}
              className={ghostButton}
              title="Abre el diálogo de impresión; elegí «Guardar como PDF» para obtener el archivo"
            >
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={download}
              disabled={state.status !== "done"}
              className={primaryButton}
              title="Descarga el reporte como archivo Markdown (.md)"
            >
              Descargar
            </button>
          </>
        }
      >
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="size-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
            <p className="font-semibold text-heading">Generando el status report…</p>
            <p className="t-secondary">Puede tardar unos segundos.</p>
          </div>
        )}
        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-semibold text-heading">No se pudo generar el reporte.</p>
            <button type="button" onClick={generate} className={primaryButton}>
              Reintentar
            </button>
          </div>
        )}
        {state.status === "done" && (
          <article>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {markdown}
            </ReactMarkdown>
          </article>
        )}
      </Modal>

      {toast}
    </>
  );
}

function SourceBadge({ report, ms }: { report: ReportResponse; ms: number }) {
  const elapsed = ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
  if (report.source === "ai") {
    return (
      <span className="rounded-[20px] bg-brand-soft px-[10px] py-[3px] text-[10.5px] font-bold text-brand-text">
        Generado con IA · {elapsed}
      </span>
    );
  }
  return (
    <span
      className="rounded-[20px] bg-surface px-[10px] py-[3px] text-[10.5px] font-bold text-ink-soft"
      title={
        report.limited
          ? "Se alcanzó el límite de reportes con IA; probá de nuevo en unos minutos"
          : "Sin API key configurada o la IA no respondió a tiempo"
      }
    >
      Generado por plantilla · {elapsed}
    </span>
  );
}
