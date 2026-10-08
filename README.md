<p align="center">
  <img src="/public/logo.png" height="120" alt="PlaylistFox">
</p>

<h1 align="center">PlaylistFox</h1>

<p align="center">
  <a href="https://github.com/anthonysfox/spotify-playlist-subscribe-v2/actions/workflows/test.yml">
    <img src="https://github.com/anthonysfox/spotify-playlist-subscribe-v2/actions/workflows/test.yml/badge.svg" alt="Tests">
  </a>
</p>

A personal Spotify playlist subscription service that lets you create managed playlists which automatically sync new songs from playlists you subscribe to — on a daily, weekly, monthly, or custom schedule.

Also doubles as a place to actually learn things properly: testing, CI/CD, database and system design, AI tool-calling, and the general practices a toy project usually lets you skip.

## How It Works

1. **Create a managed playlist** — a new Spotify playlist the app manages on your behalf, or one you already own
2. **Subscribe to source playlists** — pick any public Spotify playlists as content sources
3. **Set a sync schedule** — choose daily, weekly, monthly, or specific days of the week
4. **Sit back** — the app pulls new tracks from your sources into your managed playlist, and keeps a log of every run

## Features

**Syncing**

- Automatic syncing on a configurable schedule, plus "Sync now" for one playlist or all of them
- Multiple source playlists per managed playlist, with a configurable number of tracks per source
- Append or replace sync modes
- Explicit content filtering, track age limits, and duplicate detection across sources
- Optional **vibe prompt** — an AI curator picks the tracks from each source that best fit a description

**Visibility**

- Run history for every playlist: tracks added, what was skipped and why, and which sources contributed
- An Activity feed across all your playlists

**AI**

- A chat **assistant** that can search playlists, generate new ones from a description, add artists, and manage subscriptions. Every change it proposes shows a confirm card first — nothing happens until you approve it
- AI-generated playlist cover art
- An **MCP server**, so you can manage your playlists from Claude or any other MCP client, authenticated with personal access tokens that expire after 30, 60, or 90 days

**Also**

- Curated playlist discovery and search
- PWA support

## How Syncing Works

An hourly GitHub Actions job calls `/api/cron/sync`, authenticated with a shared `CRON_SECRET`. The route checks that secret and hands off to the sync engine in `lib/sync/`, which:

1. Finds every managed playlist whose next sync time has passed
2. Syncs them in small batches to stay inside Spotify's rate limits
3. For each playlist, pulls candidates from its sources, applies the filters and optional vibe curation, and adds the result
4. Records the outcome as a `SyncRun` — success, skipped (with a reason), or failed — which is what the run history and Activity feed show

"Sync now" and the immediate sync after subscribing go through the same route with `force=true`, scoped to one user or playlist.

## Tech Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 15 (App Router)                     |
| Frontend   | React 19, Tailwind CSS 4                    |
| State      | Zustand                                     |
| Auth       | Clerk                                       |
| Database   | PostgreSQL with Prisma ORM                  |
| AI         | Vercel AI SDK, Gemini, Vercel AI Gateway    |
| MCP        | `mcp-handler`                               |
| Testing    | Vitest, Docker Postgres for integration     |
| Scheduling | GitHub Actions (hourly cron)                |
| Deployment | Vercel (Fluid Compute)                      |

## Getting Started

Requires Node 22, pnpm, and Docker (for integration tests only).

```bash
pnpm install
pnpm prisma:migrate   # apply migrations to your dev database
pnpm dev
```

Environment variables go in `.env`. The main ones:

| Variable                                       | Used for                                           |
| ---------------------------------------------- | -------------------------------------------------- |
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Database (pooled for the app, direct for migrations) |
| Clerk keys                                     | Sign-in, and the Spotify connection via Clerk      |
| `NEXT_PUBLIC_APP_URL`                          | Base URL the app uses to call its own sync route   |
| `CRON_SECRET`                                  | Authenticates calls to `/api/cron/sync`            |
| `GEMINI_API_KEY`                               | Vibe curation                                      |
| `AI_GATEWAY_API_KEY`                           | Assistant, playlist generation, cover art          |

## Testing

Covered at two levels: unit tests for pure logic — sync scheduling, playlist dedupe/filtering, subscription rules — and integration tests that run against a real, disposable Postgres database to verify behavior a mock can't, like unique constraints and cascading deletes actually firing correctly. Both run in CI on every push and pull request.

```bash
pnpm test                 # unit tests

pnpm test:db:up           # start the throwaway Postgres (port 5433)
pnpm test:db:migrate
pnpm test:integration
pnpm test:db:down
```

## License

This is a personal project. All rights reserved.
