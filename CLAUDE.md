# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Spotify playlist subscription service built with Next.js 15, React 19, Prisma, and PostgreSQL. The application allows users to create "managed playlists" that automatically sync songs from multiple source playlists at configurable intervals (daily, weekly, monthly).

## Common Development Commands

- `npm run dev` - Start development server with Prisma generation and ngrok tunnel
- `npm run build` - Generate Prisma client, push DB schema, and build for production  
- `npm run lint` - Run Next.js linting
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations in development
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio for database inspection

## Architecture

### Database Schema (Prisma)
- **User**: Clerk-authenticated users with `clerkUserId` as unique identifier
- **ManagedPlaylist**: User-owned Spotify playlists managed by the app with sync settings
- **SourcePlaylist**: External Spotify playlists that serve as content sources
- **ManagedPlaylistSourceSubscription**: Many-to-many relationship linking managed playlists to their source subscriptions

### Frontend Structure
- **App Router**: Next.js 15 app directory structure
- **Authentication**: Clerk integration for user management
- **State Management**: Zustand store in `store/useUserStore.ts` for playlists and user data
- **Components**: Modular React components in `app/components/`
  - Playlist search and management
  - Spotify Web Player integration
  - Subscription modals and settings

### API Routes
- **Spotify Integration**: `/api/spotify/` endpoints for playlist operations, search, and player control
- **User Management**: `/api/users/` for subscription management
- **Webhooks**: `/api/webhooks/` for external integrations

### Key Features
- Spotify Web Player integration with play/pause controls
- Curated playlist discovery and search
- Subscription management with frequency settings
- Automated playlist syncing based on user-defined schedules

## Development Environment

The dev server runs with ngrok tunnel integration for webhook testing. Prisma generates the database client automatically on startup and postinstall.