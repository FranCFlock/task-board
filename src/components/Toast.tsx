"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_MS = 1900;

/** Design-system toast (bottom center, auto-hides). Render `toast` anywhere in the component. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toast = message ? (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-[10px] bg-brand-dark px-4 py-[10px] text-[13px] font-semibold text-white shadow-overlay print:hidden"
    >
      {message}
    </div>
  ) : null;

  return { show, toast };
}
