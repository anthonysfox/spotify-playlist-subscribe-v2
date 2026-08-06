import { createMcpHandler, withMcpAuth } from "mcp-handler";
import z from "zod";
import { getProvider, type MusicProvider } from "@/lib/music";
import { subscribe, SubscribeError, SubscribeParams } from "@/lib/subscribe";
import prisma from "@/lib/prisma";
import { triggerSync } from "@/lib/sync";
import { hashToken } from "@/lib/mcp-tokens";
import { describePlaylist } from "@/lib/describe-playlist";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_playlists",
      {
        title: "Search Playlists",
        description:
          "Search a music service for playlists a user could subscribe to. Returns id, name, owner, and track count for each match",
        inputSchema: {
          query: z.string().describe("What to search for, e.g. 'lo-fi study'"),
          provider: z
            .enum(["SPOTIFY", "APPLE_MUSIC"])
            .default("SPOTIFY")
            .describe("Which service to search"),
        },
      },
      async ({ query, provider }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) {
          return {
            content: [{ type: "text", text: "Not authenticated" }],
            isError: true,
          };
        }

        const client = await getProvider(provider as MusicProvider).forUser(
          userId,
        );
        if (!client) {
          return {
            content: [{ type: "text", text: `${provider} isn't connected.` }],
            isError: true,
          };
        }

        const results = await client.searchPlaylists(query, 10);

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_managed_playlist",
      {
        title: "Get Managed Playlist",
        description:
          "Gets a managed playlist from the app and its sources(subscriptions)",
        inputSchema: {
          managedPlaylistId: z
            .string()
            .describe("ID of the managed playlist in the database"),
        },
      },
      async ({ managedPlaylistId }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) {
          return {
            content: [{ type: "text", text: "Not authenticated" }],
            isError: true,
          };
        }

        const whereConditions: any = {
          deletedAt: null,
          userId,
          id: managedPlaylistId,
        };
        const playlist = await prisma.managedPlaylist.findFirst({
          where: whereConditions,
          include: {
            subscriptions: {
              where: {
                sourcePlaylist: {
                  deletedAt: null,
                },
              },
              include: { sourcePlaylist: true },
            },
          },
        });

        if (!playlist) {
          return {
            content: [{ type: "text", text: "Playlist not found." }],
            isError: true,
          };
        }

        // Best-effort "what's this like": top artists + sample tracks from the
        // managed playlist's own tracks. One provider call; never fail the tool
        // over it (provider might be disconnected, playlist empty, etc.).
        let vibe: ReturnType<typeof describePlaylist> | undefined;
        try {
          const client = await getProvider(
            playlist.provider as MusicProvider,
          ).forUser(userId);
          if (client) {
            vibe = describePlaylist(
              await client.getPlaylistTracks(playlist.externalPlaylistId),
            );
          }
        } catch {
          // enrichment is optional
        }

        const result = {
          id: playlist.id,
          name: playlist.name,
          provider: playlist.provider,
          syncFrequency: playlist.syncInterval,
          syncMode: playlist.syncMode,
          trackCount: playlist.trackCount,
          vibePrompt: playlist.vibePrompt,
          vibe,
          sources: playlist.subscriptions.map((sub) => ({
            id: sub.sourcePlaylist.id,
            name: sub.sourcePlaylist.name,
            trackCount: sub.sourcePlaylist.trackCount,
          })),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    server.registerTool(
      "trigger_sync_now",
      {
        title: "Trigger Sync Now",
        description:
          "Trigger the sync of playlists. Takes in id if the user wants to sync a single playlist. Returns a summary of what happened",
        inputSchema: {
          specificPlaylistId: z
            .string()
            .optional()
            .describe("ID of the playlist user wants to sync"),
          specificSourceId: z
            .string()
            .optional()
            .describe("ID of the source playlist user wants to sync"),
        },
      },
      async ({ specificPlaylistId, specificSourceId }, extra) => {
        if (specificSourceId && !specificPlaylistId) {
          return {
            content: [
              {
                type: "text",
                text: "specificSourceId requires specificPlaylistId.",
              },
            ],
            isError: true,
          };
        }
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) {
          return {
            content: [{ type: "text", text: "Not authenticated" }],
            isError: true,
          };
        }

        let playlist;

        if (specificPlaylistId) {
          const whereConditions: any = {
            deletedAt: null,
            userId,
            id: specificPlaylistId,
          };
          playlist = await prisma.managedPlaylist.findFirst({
            where: whereConditions,
            include: {
              subscriptions: {
                where: {
                  sourcePlaylist: {
                    deletedAt: null,
                    ...(specificSourceId ? { id: specificSourceId } : {}),
                  },
                },
                include: { sourcePlaylist: true },
              },
            },
          });

          if (!playlist) {
            return {
              content: [{ type: "text", text: "Playlist not found." }],
              isError: true,
            };
          }

          if (!playlist.subscriptions.length) {
            return {
              content: [{ type: "text", text: "Source not found." }],
              isError: true,
            };
          }
        }

        const summary = await triggerSync({
          playlistId: specificPlaylistId,
          sourceId: specificSourceId,
          userId,
          force: true,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
      },
    );

    server.registerTool(
      "list_managed_playlists",
      {
        title: "List Managed Playlists",
        description:
          "List the playlists already being managed by the application",
        inputSchema: {
          provider: z
            .enum(["SPOTIFY", "APPLE_MUSIC"])
            .optional()
            .describe("Only list playlists on this service; omit to list all"),
        },
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ provider }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) {
          return {
            content: [{ type: "text", text: "Not authenticated" }],
            isError: true,
          };
        }

        const rows = await prisma.managedPlaylist.findMany({
          where: {
            userId,
            deletedAt: null,
            ...(provider ? { provider } : {}),
          },
          include: { subscriptions: { include: { sourcePlaylist: true } } },
        });

        const playlists = rows.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          provider: playlist.provider,
          syncFrequency: playlist.syncInterval,
          syncMode: playlist.syncMode,
          trackCount: playlist.trackCount,
          sourceCount: playlist.subscriptions.length,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(playlists, null, 2) }],
        };
      },
    );

    server.registerTool(
      "create_subscription",
      {
        title: "Create Subscription",
        description: "Add a subscription for a user to be synced",
        inputSchema: {
          sourcePlaylistId: z
            .string()
            .describe("Provider id of the playlist to pull songs from"),
          managedPlaylistId: z
            .string()
            .optional()
            .describe(
              "Existing managed playlist to add to. Omit to create a new one",
            ),
          newPlaylistName: z
            .string()
            .optional()
            .describe(
              "The name of a new playlist to be created. Required if there is no managedPlaylistId",
            ),
          provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]).default("SPOTIFY"),
          syncFrequency: z
            .enum(["DAILY", "WEEKLY", "MONTHLY"])
            .default("WEEKLY"),
          syncMode: z.enum(["APPEND", "REPLACE"]).default("APPEND"),
          syncQuantityPerSource: z.number().int().min(1).max(50).default(5),
          vibePrompt: z.string().optional(),
          runImmediateSync: z.boolean().default(true),
        },
      },
      async (
        {
          sourcePlaylistId,
          managedPlaylistId,
          newPlaylistName,
          provider,
          syncFrequency,
          syncMode,
          syncQuantityPerSource,
          vibePrompt,
          runImmediateSync,
        },
        extra,
      ) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;

        if (!userId) {
          return {
            content: [{ type: "text", text: "Not authenticated" }],
            isError: true,
          };
        }

        const client = await getProvider(provider as MusicProvider).forUser(
          userId,
        );
        if (!client) {
          return {
            content: [{ type: "text", text: `${provider} isn't connected.` }],
            isError: true,
          };
        }

        if (!managedPlaylistId && !newPlaylistName) {
          return {
            content: [
              { type: "text", text: "No destination playlist specified" },
            ],
            isError: true,
          };
        }

        const source = await client.getPlaylist(sourcePlaylistId);
        if (!source)
          return {
            content: [{ type: "text", text: "Source playlist not found." }],
            isError: true,
          };

        let managedPlaylist;
        if (managedPlaylistId) {
          // An existing managed playlist lives in our DB, so resolve it there —
          // scoped to userId, which also enforces ownership (a provider lookup
          // would happily resolve any public playlist id). subscribe() expects
          // the provider id, so hand it externalPlaylistId, mirroring the source.
          const dest = await prisma.managedPlaylist.findFirst({
            where: { id: managedPlaylistId, userId, deletedAt: null },
          });
          if (!dest)
            return {
              content: [
                { type: "text", text: "Destination playlist not found." },
              ],
              isError: true,
            };
          managedPlaylist = {
            id: dest.externalPlaylistId,
            name: dest.name,
            imageUrl: dest.imageUrl,
            trackCount: dest.trackCount,
          };
        }

        const params: SubscribeParams = {
          userId,
          sourcePlaylist: {
            id: source.id,
            name: source.name,
            imageUrl: source.imageUrl,
            trackCount: source.trackCount,
          },
          managedPlaylist,
          newPlaylistName,
          provider: provider as MusicProvider,
          syncFrequency,
          syncMode,
          syncQuantityPerSource,
          vibePrompt,
          runImmediateSync,
        };

        try {
          const result = await subscribe({ ...params });

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          if (err instanceof SubscribeError) {
            return {
              content: [{ type: "text", text: err.message }],
              isError: true,
            };
          }
          throw err;
        }
      },
    );
  },
  {},
  { basePath: "/api", maxDuration: 60, verboseLogs: true },
);

/**
 * Turn a bearer token into an identity by looking up its hash. Each token belongs
 * to exactly one user, so this is what makes the server genuinely multi-user:
 * whoever's token was presented is who every tool then acts as.
 *
 * We only ever store the SHA-256, so a direct lookup by hash both authenticates
 * and resolves the user in one query. Revoked tokens (`revokedAt` set) don't match.
 */
async function verifyToken(token?: string) {
  if (!token) return undefined;

  const record = await prisma.mcpAccessToken.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null },
    select: { id: true, userId: true },
  });

  if (!record) return undefined;

  // Fire-and-forget: record usage for the token list ("last used"). A failure
  // here must never block an otherwise-valid request.
  prisma.mcpAccessToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    token,
    scopes: ["playlists:read", "playlists:write"],
    clientId: "mcp",
    extra: { userId: record.userId },
  };
}

const authHandler = withMcpAuth(
  handler,
  async (_req, token) => verifyToken(token),
  { required: true },
);

export { authHandler as GET, authHandler as POST };
