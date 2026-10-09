"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { dangerButton, ghostButton, iconButton, primaryButton } from "@/components/ui";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Extra content next to the title (e.g. a badge). */
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** "sm" = DS modal width (470px); "lg" for long content like the report. */
  size?: "sm" | "lg";
  /** Extra classes for the overlay (e.g. "print-root"). */
  overlayClassName?: string;
}

/** Design-system modal, portaled to <body>. Closes on Esc, the X button or a click outside. */
export default function Modal({
  open,
  onClose,
  title,
  headerExtra,
  footer,
  children,
  size = "sm",
  overlayClassName = "",
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(48,8,64,.5)] p-4 backdrop-blur-[2px] sm:p-8 ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`report-pop w-full rounded-[16px] bg-panel text-ink shadow-overlay ${size === "sm" ? "max-w-[470px]" : "max-w-3xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4 print:hidden">
          <h2 id={titleId} className="t-card-title text-brand-dark">
            {title}
          </h2>
          {headerExtra}
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`ml-auto ${iconButton}`}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="px-5 py-4 text-[14px]">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 print:hidden">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Yes/no confirmation built on Modal. `danger` styles the confirm button for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" onClick={onCancel} className={ghostButton}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className={danger ? dangerButton : primaryButton} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
