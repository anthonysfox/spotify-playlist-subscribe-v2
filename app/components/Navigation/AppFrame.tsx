import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getConnectionsForUser } from "@/lib/connections";
import { getManagedPlaylistsForUser } from "@/lib/managed-playlists";
import { AppFrameClient } from "./AppFrameClient";

/**
 * Server wrapper shared by every signed-in route. Resolves auth and pre-fetches
 * the data the rail and the first screen need — calling the domain functions
 * directly rather than round-tripping through our own HTTP routes.
 */
export async function AppFrame({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const [connections, managedPlaylists] = await Promise.all([
    getConnectionsForUser(user.id).catch(() => null),
    getManagedPlaylistsForUser(user.id).catch(() => []),
  ]);

  // currentUser() returns a Clerk `User` class instance — round-tripping
  // through JSON strips the prototype so it can cross to a Client Component.
  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <AppFrameClient
      userData={plainUser}
      initialConnections={connections}
      initialManagedPlaylists={managedPlaylists as any}
    >
      {children}
    </AppFrameClient>
  );
}
