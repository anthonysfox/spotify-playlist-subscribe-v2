"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Compass, Library, Activity, PlugZap } from "lucide-react";
import {
  useMusicStore,
  connectedProviders,
  PROVIDER_LABELS,
} from "store/useMusicStore";
import { useUserStore } from "store/useUserStore";
import type { MusicProvider } from "@/lib/music/types";
import { ACTIVITY_SEEN_KEY } from "../ActivityFeed";
import { SearchAssistant } from "../SearchAssistant";

/**
 * Signed-in chrome for the redesign (artboards 1a / 5c).
 *
 * - >= 900px: a 216px left rail with four destinations, a services block, and
 *   the account chip pinned to the bottom.
 * - < 900px: the same four destinations as a bottom tab bar; the rail is hidden.
 *
 * Real routes replace the old `activeTab` state that lived in Dashboard, so the
 * active item is derived from the pathname rather than passed around.
 */

const NAV: {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Compass;
}[] = [
  { href: "/", label: "Discover", shortLabel: "Discover", icon: Compass },
  { href: "/library", label: "Library", shortLabel: "Library", icon: Library },
  {
    href: "/activity",
    label: "Activity",
    shortLabel: "Activity",
    icon: Activity,
  },
  {
    href: "/settings/connections",
    label: "Connections",
    shortLabel: "You",
    icon: PlugZap,
  },
];

const PROVIDER_DOT: Record<MusicProvider, string> = {
  SPOTIFY: "bg-spotify",
  APPLE_MUSIC: "bg-apple",
};

function itemIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const connections = useMusicStore((s) => s.connections);
  const connected = connectedProviders(connections);
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);

  // Red dot on Activity for a failed run the user hasn't looked at yet.
  const [activitySeen, setActivitySeen] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        setActivitySeen(localStorage.getItem(ACTIVITY_SEEN_KEY));
      } catch {
        /* ignore */
      }
    };
    read();
    window.addEventListener("pf:activity-seen", read);
    return () => window.removeEventListener("pf:activity-seen", read);
  }, []);
  const hasUnseenFailure = managedPlaylists.some((p) => {
    const r = p.lastRun;
    if (!r || (r.status !== "failed" && r.status !== "stale")) return false;
    return !activitySeen || new Date(r.startedAt) > new Date(activitySeen);
  });

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-ground min-[900px]:flex-row">
      {/* ---- Left rail (desktop) ---- */}
      <aside className="hidden w-[216px] shrink-0 flex-col border-r border-line bg-surface px-3 py-5 min-[900px]:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
            <Image
              src="/logo.png"
              alt="PlaylistFox"
              width={34}
              height={34}
              className="h-[34px] w-[34px] object-cover"
            />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
            Playlist<span className="text-brand">Fox</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = itemIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-brand-tint text-brand-deep"
                    : "text-ink-50 hover:bg-ground-alt hover:text-ink-70"
                }`}
              >
                <span className="relative">
                  <Icon
                    className={`h-[18px] w-[18px] ${active ? "text-brand" : "text-ink-35"}`}
                    strokeWidth={active ? 2.25 : 2}
                  />
                  {href === "/activity" && hasUnseenFailure && (
                    <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-warn" />
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {connected.length > 0 && (
            <div className="rounded-xl border border-line px-3 py-2.5">
              <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                Services
              </div>
              <ul className="flex flex-col gap-1.5">
                {connected.map((provider) => (
                  <li
                    key={provider}
                    className="flex items-center gap-2 text-[12.5px] text-ink-70"
                  >
                    <span
                      className={`h-[7px] w-[7px] shrink-0 rounded-full ${PROVIDER_DOT[provider]}`}
                    />
                    {PROVIDER_LABELS[provider]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 px-2">
            {/* Apple Music + MCP tokens moved to /settings/connections, so the
                account menu is just Clerk's own pages now. */}
            <UserButton
              appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }}
            />
            <span className="truncate text-[12.5px] text-ink-50">Account</span>
          </div>
        </div>
      </aside>

      {/* ---- Content ---- */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* Reachable from every signed-in screen (portals to body). */}
      <SearchAssistant />

      {/* ---- Bottom tab bar (mobile) ---- */}
      <nav className="flex shrink-0 items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] min-[900px]:hidden">
        {NAV.map(({ href, shortLabel, icon: Icon }) => {
          const active = itemIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-medium ${
                active ? "text-brand" : "text-ink-35"
              }`}
            >
              <span className="relative">
                <Icon
                  className="h-[20px] w-[20px]"
                  strokeWidth={active ? 2.25 : 2}
                />
                {href === "/activity" && hasUnseenFailure && (
                  <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-warn" />
                )}
              </span>
              {shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
