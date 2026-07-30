"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/battle", label: "对战", icon: "⚔️" },
  { href: "/record", label: "记录", icon: "📝" },
  { href: "/trends", label: "趋势", icon: "📈" },
  { href: "/report", label: "周报", icon: "📰" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom sticky bottom-0 z-40 px-4 pb-2 pt-1">
      <ul className="card-soft grid grid-cols-4 gap-1 p-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 rounded-[18px] px-1 py-2.5 text-[11px] transition-colors ${
                  active ? "bg-ink text-white" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] leading-none ${
                    active ? "bg-moss" : "bg-sand"
                  }`}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                <span className={active ? "font-semibold text-white" : ""}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
