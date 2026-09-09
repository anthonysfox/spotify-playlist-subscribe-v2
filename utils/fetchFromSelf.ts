import { headers } from "next/headers";
import { getAppUrl } from "utils/config";

/**
 * Calls one of our own API routes from the server, forwarding the incoming
 * request's cookies so Clerk's auth() inside the route resolves the same
 * signed-in user — the same "absolute-URL self-fetch" pattern lib/subscribe.ts
 * already uses for its immediate-sync trigger.
 *
 * Reuses the route handlers as-is (they already do real work — Spotify
 * metadata refresh, Prisma writes) rather than duplicating that logic in every
 * server component that needs the dashboard's initial data.
 */
export async function fetchFromSelf<T = any>(path: string): Promise<T | null> {
  const cookieHeader = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${getAppUrl()}${path}`, {
      headers: { cookie: cookieHeader },
      // Per-user data — never let Next's fetch cache share this across requests.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
