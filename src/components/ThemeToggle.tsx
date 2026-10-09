"use client";

// Must match the key read by the inline script in app/layout.tsx.
const THEME_KEY = "status-board:theme";

/** Light/dark switch for the header (DS "Light" button on brand). The icon follows the theme through CSS. */
export default function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // Private mode: the choice just lasts for this visit.
    }
  };

  const icon = { viewBox: "0 0 24 24", className: "size-[18px]", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar entre tema claro y oscuro"
      className="inline-flex size-[38px] items-center justify-center rounded-[9px] bg-white/[.14] text-white transition-colors hover:bg-white/[.26] active:translate-y-px"
    >
      {/* Shows the theme you would switch to: moon in light mode, sun in dark mode. */}
      <svg {...icon} className="size-[18px] dark:hidden">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg {...icon} className="hidden size-[18px] dark:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
