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
- `lib/db/prisma.ts` — Prisma client
- `store/` — Zustand stores (`useUserStore` holds managed playlists and pending source removals)
- `utils/` — small framework-free helpers only; app logic belongs in `lib/`

`lib/` files imported by client components (`sync/status.ts`, `sync/runs.ts`, `sync/track-filters.ts`, `agent/describe-proposal.ts`) must not import Prisma or other server code — use `import type` for server types.

## Data Model

- **User** — keyed by Clerk user id
- **ManagedPlaylist** — a playlist the app writes to, with sync settings; `externalPlaylistId` is the provider's id, `id` is ours
- **SourcePlaylist** — a playlist tracks are pulled from, shared across users
- **ManagedPlaylistSourceSubscription** — links the two
- **SyncRun** — one row per sync attempt: status (`RUNNING`/`SUCCESS`/`SKIPPED`/`FAILED`), trigger, tracks added, skip counts, per-source breakdown
- **McpAccessToken** — personal tokens for the MCP server (30/60/90-day expiry)
- **AuditLog**

**Database ids vs provider ids:** `PlaylistRef.id` from callers and `externalPlaylistId` are Spotify/Apple ids. The sync engine and API routes filter on database ids. Never pass one where the other is expected — a provider id given to `triggerSync` as `playlistId` silently matches nothing, and an undefined one widens a forced sync to every playlist.

## Syncing

- An hourly GitHub Actions workflow (`.github/workflows/scheduled-sync.yml`) calls `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.
- The route only authenticates and parses params; `runSync()` in `lib/sync/engine.ts` does the work and returns a `SyncSummary`. Keep HTTP concerns (`NextResponse`, request parsing) out of `lib/`.
- Other code that starts a sync should go through `triggerSync()` (the MCP `trigger_sync_now` tool and the immediate sync in `subscribe()` do; `/api/users/me/sync` still builds the URL by hand and should be migrated). In request handlers, fire-and-forget work must be wrapped in `after()` from `next/server` and the callback must return the promise.
- Sync routes set `maxDuration = 300`; the project runs on Fluid Compute (`vercel.json`). Without it, functions are capped at 10s and the cron returns 504.

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

`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, Clerk keys, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `GEMINI_API_KEY` (curator), `AI_GATEWAY_API_KEY` (assistant, generation, cover art). Optional: model overrides (`CURATOR_MODEL`, `GENERATE_PLAYLIST_MODEL`, `COVER_ART_*_MODEL`), `APPLE_MUSIC_TEAM_ID` / `APPLE_MUSIC_KEY_ID` / `APPLE_MUSIC_PRIVATE_KEY`.
