# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, and others) working in this repository. `CLAUDE.md` imports this file, so this is the one to edit.

## Project Overview

PlaylistFox: users create "managed playlists" that automatically sync new tracks from source playlists on a schedule (daily, weekly, monthly, or custom days). Built with Next.js 15 (App Router), React 19, Prisma 7 on PostgreSQL, Clerk auth, and the Vercel AI SDK.

The product is presented as Spotify-first. Apple Music support exists in the code (`lib/music/apple.ts`, `/api/apple-music/`, the connections page) but is deliberately de-emphasized for now — keep it working, but don't surface or promote it in UI copy or docs unless asked.

## Commands

Package manager is **pnpm** (CI uses `pnpm install --frozen-lockfile`).

- `pnpm dev` — generate Prisma client and start the dev server
- `pnpm build` — generate client, `prisma migrate deploy`, `next build`
- `pnpm lint` / `pnpm format` / `pnpm format:check`
- `pnpm prisma:migrate` — create/apply a migration in development
- `pnpm prisma:studio` — inspect the database
- `pnpm test` — unit tests (Vitest)
- `pnpm test:db:up && pnpm test:db:migrate && pnpm test:integration` — integration tests against a throwaway Postgres on port 5433 (Docker); `pnpm test:db:down` afterwards

Run `pnpm test` and `npx tsc --noEmit` after changes.

## Layout

- `app/` — pages (`/`, `/library`, `/library/[id]/[tab]`, `/activity`, `/profile`, `/settings/connections`) and API routes
- `app/components/` — grouped by feature: `Playlist/`, `Chat/`, `Navigation/`, `Modals/`, …
- `lib/sync/` — the sync engine and everything around it:
  `engine.ts` (`runSync`, per-playlist sync), `trigger.ts` (`triggerSync`, calls the cron route over HTTP), `runs.ts` (`SyncRun` read helpers), `status.ts` (`deriveStatus` for UI), `schedule.ts` (next sync time), `track-filters.ts`, `curator.ts` (vibe selection)
- `lib/playlists/` — domain logic: `subscribe.ts`, `unsubscribe.ts`, `managed.ts`, `generate-playlist.ts`, `describe-playlist.ts`, `cover-art.ts`
- `lib/music/` — provider abstraction (`getProvider(provider).forUser(userId)`); Spotify tokens come from Clerk OAuth (`utils/clerk.ts`)
- `lib/agent/` — chat assistant tools and the proposal/confirm flow
- `lib/tracks/` — the mood-search catalog: `index-tracks.ts` (`indexTracks`, run after each cron sync), `sources/` (MusicBrainz and Last.fm clients, each with its own rate limiter), `tags.ts` (`cleanTags`), `vibe-profile.ts` (Gemini profile from tags only), `embed.ts`, `search.ts` (hybrid vector + full-text search), `spotify-ids.ts` (ISRC → Spotify id cache)
- `lib/db/prisma.ts` — Prisma client
- `scripts/` — one-off scripts run with `pnpm tsx --env-file=.env …` (`backfill-tracks.ts`, `export-embeddings.ts`)
- `store/` — Zustand stores (`useUserStore` holds managed playlists and pending source removals)
- `utils/` — small framework-free helpers only; app logic belongs in `lib/`

`lib/` files imported by client components (`sync/status.ts`, `sync/runs.ts`, `sync/track-filters.ts`, `agent/describe-proposal.ts`) must not import Prisma or other server code — use `import type` for server types.

## Data Model

- **User** — keyed by Clerk user id
- **ManagedPlaylist** — a playlist the app writes to, with sync settings; `externalPlaylistId` is the provider's id, `id` is ours
- **SourcePlaylist** — a playlist tracks are pulled from, shared across users
- **ManagedPlaylistSourceSubscription** — links the two
- **SyncRun** — one row per sync attempt: status (`RUNNING`/`SUCCESS`/`SKIPPED`/`FAILED`), trigger, tracks added, skip counts, per-source breakdown
- **Track** — the mood-search catalog, keyed by ISRC. `status`: `INDEXED` (has a vibe profile and embedding), `UNINDEXED` (too few tags to describe; not retried), `FAILED` (retried on the next run), `PENDING`. Stores no Spotify data.
- **SpotifyTrackCache** — ISRC → Spotify track id with a 7-day expiry, refreshed by every sync and filled on demand by search
- **McpAccessToken** — personal tokens for the MCP server (30/60/90-day expiry)
- **AuditLog**

**Database ids vs provider ids:** `PlaylistRef.id` from callers and `externalPlaylistId` are Spotify/Apple ids. The sync engine and API routes filter on database ids. Never pass one where the other is expected — a provider id given to `triggerSync` as `playlistId` silently matches nothing, and an undefined one widens a forced sync to every playlist.

## Syncing

- An hourly GitHub Actions workflow (`.github/workflows/scheduled-sync.yml`) calls `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.
- The route only authenticates and parses params; `runSync()` in `lib/sync/engine.ts` does the work and returns a `SyncSummary`. Keep HTTP concerns (`NextResponse`, request parsing) out of `lib/`.
- Other code that starts a sync should go through `triggerSync()` (the MCP `trigger_sync_now` tool and the immediate sync in `subscribe()` do; `/api/users/me/sync` still builds the URL by hand and should be migrated). In request handlers, fire-and-forget work must be wrapped in `after()` from `next/server` and the callback must return the promise.
- Sync routes set `maxDuration = 300`; the project runs on Fluid Compute (`vercel.json`). Without it, functions are capped at 10s and the cron returns 504.

## Mood Search

- Vibe profiles are built only from MusicBrainz and Last.fm tags. Never send a track's title or artist to the model, and never store or embed Spotify data in `tracks`: titles drowned out mood in the old embeddings, and Spotify's terms forbid using their data for ML.
- `hasEnoughSignal` gates generation (at least 1 track tag or 3 artist tags). Tracks below it are `UNINDEXED`; don't loosen it to raise coverage — a made-up profile matches the wrong searches.
- In the indexing pipeline, "no match" returns `null`/`[]` and real failures throw, so `indexTracks` can tell `UNINDEXED` from `FAILED`. Don't catch errors lower down.
- Indexing runs from the cron route: `runSync` collects the tracks it saw into `tracksToIndex`, then `after()` calls `indexTracks` with a 240s deadline. Only tracks from playlists synced in that run are indexed; anything else waits as `PENDING` for the next run or the backfill.
- Per track the indexer calls MusicBrainz (ISRC lookup) and Last.fm (`track.getTopTags` + `artist.getTopTags`), then the AI Gateway (profile, then embedding). Spotify is never called during indexing. Each source has a module-level slot limiter (MusicBrainz 1100ms, Last.fm 250ms); keep new callers going through them.
- Embeddings are `google/gemini-embedding-001` at 1536 dimensions (`vector(1536)`), `RETRIEVAL_DOCUMENT` for tracks and `RETRIEVAL_QUERY` for searches. Changing the model or dimensions means re-embedding every `INDEXED` row.
- `searchTracksByVibe(userId, vibe, limit)` (chat tool `searchTracksByVibe`, MCP `search_existing_tracks_by_vibe`) merges vector and full-text rankings with Reciprocal Rank Fusion (k=60), then resolves Spotify ids through `SpotifyTrackCache` and `/search?q=isrc:` and drops tracks Spotify can't find (users without a Spotify connection get every result with `spotifyId: null`). Misses are never cached, because `searchTracks` returns `[]` on errors too.
- Search must filter on `status = 'INDEXED'`. There's no vector index yet (an exact scan is fine at this size); Prisma drops hand-made HNSW indexes as drift, so add one in a migration with a comment when it's needed.
- Backfill waiting tracks with `pnpm tsx --env-file=.env scripts/backfill-tracks.ts` (`--limit N`, `--retry-failed`).

## Assistant and MCP

- `/api/chat` — chat assistant (`google/gemini-2.5-flash` via the AI Gateway) with tools in `lib/agent/tools.ts`.
- Mutating tools never change anything directly. They return an `AgentProposal`; the UI renders a confirm card, and only on approval does the client POST it to `/api/agent/execute`, which runs `executeProposal`.
- The confirm card text is built from the proposal's `params` by `describeProposal()` (`lib/agent/describe-proposal.ts`), not from the model-written `title`/`detail`, so what the user approves is what runs. Adding an action to `AgentProposal` requires a case there.
- `/api/[transport]` — MCP server (`mcp-handler`), authenticated with `McpAccessToken`s.

## Security Conventions

- The acting user always comes from the session (`auth()` from Clerk) or a verified MCP token — never from a request body or query param. `__tests__/subscribe-route.test.ts` guards this for subscribe.
- Domain functions take `userId` as a parameter and scope every query by it (e.g. `managedPlaylist: { userId }`).
- `/api/cron` and `/api/webhooks` are public in `middleware.ts`; the cron route authenticates with `CRON_SECRET` (constant-time compare, fails closed if unset).

## Testing

- Unit tests in `__tests__/*.test.ts`; integration tests in `__tests__/*.integration.test.ts` (excluded from `pnpm test`).
- Route/domain tests mock collaborators with top-level `vi.mock` + `vi.hoisted`; see `__tests__/subscribe-route.test.ts`. Helpers in `__tests__/helpers/route.ts`.
- **When moving a file in `lib/`, update every `vi.mock("@/lib/...")` path that pointed at it.** A stale mock path does not error — the test silently runs against the real module (and may try to reach a real database).

## Environment

`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, Clerk keys, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY` (curator), `LASTFM_API_KEY` (track tags), `AI_GATEWAY_API_KEY` (assistant, generation, cover art, vibe profiles, embeddings). Optional: model overrides (`CURATOR_MODEL`, `VIBE_PROFILE_MODEL`, `VIBE_PROFILE_MIN_INTERVAL_MS` (default 0; 4500 if pointed at Gemini's free tier), `GENERATE_PLAYLIST_MODEL`, `COVER_ART_*_MODEL`), `APPLE_MUSIC_TEAM_ID` / `APPLE_MUSIC_KEY_ID` / `APPLE_MUSIC_PRIVATE_KEY`.
