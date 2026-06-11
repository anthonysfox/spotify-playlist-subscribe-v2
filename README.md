<p align="center">
  <img src="/public/logo.png" height="120" alt="PlaylistFox">
</p>

<h1 align="center">PlaylistFox</h1>

A personal Spotify playlist subscription service that lets you create managed playlists which automatically sync new songs from playlists you subscribe to — on a daily, weekly, or monthly schedule.

> This is a personal project and is not intended for public use, distribution, or contribution.

## How It Works

1. **Create a managed playlist** — a new Spotify playlist owned by the app on your behalf
2. **Subscribe to source playlists** — pick any public Spotify playlists as content sources
3. **Set a sync schedule** — choose daily, weekly, monthly, or a custom interval
4. **Sit back** — the app automatically pulls new tracks from your sources into your managed playlist

## Features

- Automatic playlist syncing on a configurable schedule
- Subscribe to multiple source playlists per managed playlist
- Configurable sync quantity per source
- Append or replace sync modes
- Explicit content filtering and track age limits
- Curated playlist discovery and search
- Spotify Web Player integration
- PWA support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Frontend | React 19, Tailwind CSS 4 |
| State | Zustand |
| Auth | Clerk |
| Database | PostgreSQL with Prisma ORM |
| Animations | GSAP |
| Deployment | Vercel |

## License

This is a personal project. All rights reserved.
