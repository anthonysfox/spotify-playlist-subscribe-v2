<p align="center">
  <img src="/public/logo.png" height="120" alt="PlaylistFox">
</p>

<h1 align="center">PlaylistFox</h1>

A web app that lets you create managed Spotify playlists that automatically sync new songs from playlists you subscribe to — on a daily, weekly, or monthly schedule.

## How It Works

1. **Create a managed playlist** — a new Spotify playlist owned by the app on your behalf
2. **Subscribe to source playlists** — pick any public Spotify playlists as content sources
3. **Set a sync schedule** — choose daily, weekly, monthly, or a custom interval
4. **Sit back** — the app automatically pulls new tracks from your sources into your managed playlist

## Features

- Automatic playlist syncing on a configurable schedule (daily / weekly / monthly / custom)
- Subscribe to multiple source playlists per managed playlist
- Configurable sync quantity per source
- Append or replace sync modes
- Explicit content filtering
- Track age limits
- Curated playlist discovery and search
- Spotify Web Player integration
- PWA support with install prompt

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Frontend | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Auth | [Clerk](https://clerk.com/) |
| Database | PostgreSQL with [Prisma 7](https://www.prisma.io/) ORM |
| Animations | [GSAP](https://gsap.com/) |
| Deployment | [Vercel](https://vercel.com/) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Spotify Developer app credentials
- Clerk account

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

### Install & Run

```bash
npm install
npm run dev
```

The dev server starts at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Prisma generation |
| `npm run build` | Production build (generates Prisma client, pushes schema, builds Next.js) |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:push` | Push schema changes to database |
| `npm run prisma:studio` | Open Prisma Studio |

## Project Structure

```
app/
  api/
    cron/sync/         # Scheduled sync job
    spotify/           # Spotify API proxy routes (playlists, search, player, token)
    users/me/          # User & subscription management
    webhooks/          # Clerk webhook handler
  components/          # React components (modals, navigation, playlists, skeletons)
  profile/             # Profile page
  sign-in/             # Clerk sign-in page
prisma/
  schema.prisma        # Database schema
store/
  useUserStore.ts      # Zustand store
```

## Database Models

- **User** — Clerk-authenticated user with Spotify tokens
- **ManagedPlaylist** — User-owned destination playlist with sync settings
- **SourcePlaylist** — External Spotify playlist used as a content source
- **ManagedPlaylistSourceSubscription** — Links managed playlists to their sources
- **AuditLog** — Tracks all changes for observability

## License

Private
