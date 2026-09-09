import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchFromSelf } from "utils/fetchFromSelf";
import type { MusicProvider } from "@/lib/music/types";
import { AppFrameClient } from "./AppFrameClient";

/**
 * Server wrapper shared by every signed-in route (`/`, `/library`, `/activity`,
 * `/settings/connections`). Resolves auth, pre-fetches the data the rail and
 * the first screen need, and hands it to the client seeder + `AppShell`.
 *
 * Reuses the existing route handlers via `fetchFromSelf` rather than
 * duplicating their work (Spotify metadata refresh, Prisma writes).
 */
export async function AppFrame({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const [connectionsData, managedPlaylists] = await Promise.all([
    fetchFromSelf<{ connections: Record<MusicProvider, boolean> }>(
      "/api/music/connections",
    ),
    fetchFromSelf("/api/users/me/managed-playlists"),
  ]);

  // currentUser() returns a Clerk `User` class instance — round-tripping
  // through JSON strips the prototype so it can cross to a Client Component.
  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <AppFrameClient
      userData={plainUser}
      initialConnections={connectionsData?.connections ?? null}
      initialManagedPlaylists={managedPlaylists ?? []}
    >
      {children}
    </AppFrameClient>
  );
}
