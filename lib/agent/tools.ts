import { tool } from "ai";
import z from "zod";
import { getProvider, MusicProvider } from "../music";
import prisma from "../prisma";
import { subscribe } from "../subscribe";

export function buildTools(userId: string) {
  return {
    searchPlaylists: tool({
      description: "Search a music service for playlists to subscribe to.",
      inputSchema: z.object({
        query: z.string(),
        provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]).default("SPOTIFY"),
      }),
      execute: async ({ query, provider }) => {
        const client = await getProvider(provider as MusicProvider).forUser(
          userId,
        );
        if (!client) return { error: `${provider} isn't connected` };
        return client.searchPlaylists(query, 10);
      },
    }),

    listManagedPlaylists: tool({
      description: "List the user's managed playlists",
      inputSchema: z.object({}),
      execute: async () =>
        prisma.managedPlaylist.findMany({
          where: { userId, deletedAt: null },
          select: { id: true, name: true, provider: true },
        }),
    }),

    createSubscription: tool({
      description: "Subscribe a source playlist to a managed one.",
      inputSchema: z.object({
        sourcePlaylistId: z.string(),
        newPlaylistName: z.string().optional(),
        managedPlaylistId: z.string().optional(),
        syncFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
        provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]).default("SPOTIFY"),
      }),
      // TODO: re-enable a confirm step once the chat UI can render approvals.
      // needsApproval: true,
      execute: async ({
        sourcePlaylistId,
        newPlaylistName,
        syncFrequency,
        provider,
      }) => {
        const client = await getProvider(provider).forUser(userId);
        if (!client) return { error: `${provider} isn't connected` };
        const source = await client.getPlaylist(sourcePlaylistId);
        if (!source) return { error: "Source not found." };
        return subscribe({
          userId,
          sourcePlaylist: {
            id: source.id,
            name: source.name,
            imageUrl: source.imageUrl,
            trackCount: source.trackCount,
          },
          newPlaylistName,
          syncFrequency,
        });
      },
    }),
  };
}
