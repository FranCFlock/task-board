"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ISODate, ReportResponse } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; report: ReportResponse; ms: number }
  | { status: "error" };

const TOAST_MS = 1900;

const ghostButton =
  "inline-flex items-center gap-[7px] rounded-[9px] border border-line-strong bg-panel px-4 py-[9px] text-[13px] font-semibold text-ink transition-colors hover:bg-surface active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "inline-flex items-center gap-[7px] rounded-[9px] bg-brand px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

// Markdown styled with design-system tokens (no typography plugin).
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="t-section mb-1 text-brand-dark">{children}</h1>,
  h2: ({ children }) => <h2 className="t-card-title mb-2 mt-6 text-brand-dark">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 font-bold text-brand-dark">{children}</h3>,
  p: ({ children }) => <p className="my-2">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand-2">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-brand-2">{children}</ol>,
  strong: ({ children }) => <strong className="font-bold text-brand-dark">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-brand underline" target="_blank" rel="noreferrer">
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

export default function ReportPanel({ today }: { today: ISODate }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    const start = performance.now();
    try {
      const res = await fetch("/api/report", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const report = (await res.json()) as ReportResponse;
      setState({ status: "done", report, ms: performance.now() - start });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const openPanel = () => {
    setOpen(true);
    if (state.status !== "done") void generate();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

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
    const previousTitle = document.title;
    document.title = `status-report-${today}`;
    window.print();
    document.title = previousTitle;
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
        Generar status report
      </button>

      {open &&
        createPortal(
        <div
          className="print-root fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(48,8,64,.5)] p-4 backdrop-blur-[2px] sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="report-pop w-full max-w-3xl rounded-[16px] bg-panel text-ink shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-line px-5 py-4 print:hidden">
              <h2 id="report-title" className="t-card-title text-brand-dark">
                Status report
              </h2>
              {state.status === "done" && <SourceBadge report={state.report} ms={state.ms} />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="ml-auto grid size-[30px] place-items-center rounded-[6px] text-ink-faint transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            <div className="px-5 py-4 text-[14px]">
              {state.status === "loading" && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <span className="size-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
                  <p className="font-semibold text-brand-dark">Generando el status report…</p>
                  <p className="t-secondary">Puede tardar unos segundos.</p>
                </div>
              )}
              {state.status === "error" && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="font-semibold text-brand-dark">No se pudo generar el reporte.</p>
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
            </div>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 print:hidden">
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
            </footer>
          </div>
        </div>,
          document.body,
        )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-[10px] bg-brand-dark px-4 py-[10px] text-[13px] font-semibold text-white shadow-overlay print:hidden"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function SourceBadge({ report, ms }: { report: ReportResponse; ms: number }) {
  const elapsed = ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
  if (report.source === "ai") {
    return (
      <span className="rounded-[20px] bg-brand-soft px-[10px] py-[3px] text-[10.5px] font-bold text-brand">
        Generado con IA · {elapsed}
      </span>
    );
  }
  return (
    <span
      className="rounded-[20px] bg-surface px-[10px] py-[3px] text-[10.5px] font-bold text-ink-soft"
      title="Sin API key configurada o la IA no respondió a tiempo"
    >
      Generado por plantilla · {elapsed}
    </span>
  );
}
