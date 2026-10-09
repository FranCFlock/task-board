import Link from "next/link";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** URL-driven tabs (?tab=<id>), sticky under the header. */
export default function Tabs({ tabs, active }: { tabs: TabItem[]; active: string }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={`?tab=${tab.id}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-[18px] py-[15px] text-[14px] font-semibold transition-colors ${
                isActive
                  ? "border-brand text-brand-dark"
                  : "border-transparent text-ink-soft hover:text-brand-dark"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-mono rounded-[20px] bg-surface px-2 py-[2px] text-[11px] text-ink-soft">
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
