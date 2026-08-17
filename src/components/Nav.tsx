"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar on desktop, bottom bar on mobile — same links, one component.
 * Uses <Link> so navigation is client-side and instant after first load.
 */

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/log", label: "Log", icon: ListIcon },
  { href: "/groups", label: "Groups", icon: GroupIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={`press flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
              active ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-raised hover:text-ink"
            }`}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/90 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
                active ? "text-accent-text" : "text-faint"
              }`}
            >
              {/* Active indicator rides the top edge, so the tab reads as selected
                  without relying on colour alone. */}
              <span
                aria-hidden
                className="absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity"
                style={{ background: "var(--accent)", opacity: active ? 1 : 0 }}
              />
              <Icon />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* Inline icons — no icon library, no extra bytes. */
const stroke = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden {...stroke}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /></svg>;
}
function ListIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden {...stroke}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>;
}
function GroupIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden {...stroke}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c0-3.2 2.8-5.2 6.2-5.2s6.2 2 6.2 5.2" /><path d="M16.5 5.4a3 3 0 0 1 0 5.6M18 14.2c2.1.6 3.5 2.2 3.5 4.4" /></svg>;
}
function UserIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden {...stroke}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" /></svg>;
}
