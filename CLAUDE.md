# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orkula is an olive grove management application built with React Router v7 (full-stack SSR) and PostgreSQL. It supports multi-tenant isolation (each farm/organization is a tenant).

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Start production:** `npm run start`
- **Typecheck:** `npm run typecheck` (runs `react-router typegen && tsc`)
- **Prisma migrations:** `npx prisma migrate dev`
- **Prisma generate:** `npx prisma generate`
- **Seed database:** `npx prisma db seed`

No test runner is currently configured.

## Architecture

### Framework & Routing

React Router v7 with SSR enabled, file-based routing defined in `app/routes.ts`. Routes use the loader/action pattern for data fetching and mutations (no client-side state management library).

Path alias: `~/*` maps to `./app/*`.

### Key Directories

- `app/routes/` — Route modules (loaders, actions, components)
- `app/components/` — React components including shadcn/ui primitives in `ui/`
- `app/lib/` — Server utilities (auth, password hashing, Zod validations)
- `app/db/` — Prisma client setup
- `prisma/` — Schema, migrations, seed script

### Database

PostgreSQL via Prisma ORM (`@prisma/adapter-pg`). Generated client output is in `generated/prisma/`. Requires `DATABASE_URL` in `.env`.

Core models: Tenant → Users, Groves, Harvests. Users have roles (OWNER, ADMIN, MEMBER). Groves track olive varieties via GroveVariety join model.

### Authentication

Session-based auth in `app/lib/auth.server.ts`. Tokens stored in DB with 30-day expiry, set as httpOnly cookies (`session_token`). Passwords hashed with Node.js crypto scrypt. Dashboard routes are protected via loader checks that redirect to `/login`.

### Styling

Tailwind CSS v4 with custom theme colors (forest green `#1b4019`, cream `#ede8d0`). UI components from shadcn/ui. Geist font via `@fontsource-variable/geist`.

### Deployment

Dockerfile included (Node 20 Alpine). PWA configured via `vite-plugin-pwa`.
