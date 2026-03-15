# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orkula is an olive grove management application built with React Router v7 (full-stack SSR) and PostgreSQL. It supports multi-tenant isolation (each farm/organization is a tenant). The UI supports Croatian (`hr`) and English (`en`) via i18next, with Croatian as the default.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Start production:** `npm run start`
- **Typecheck:** `npm run typecheck` (runs `react-router typegen && tsc`)
- **Prisma migrations:** `npx prisma migrate dev`
- **Prisma generate:** `npx prisma generate`
- **Seed database:** `npx prisma db seed` (creates user `owner@orkula.dev` / `password123`)

No test runner is currently configured.

## Architecture

### Framework & Routing

React Router v7 with SSR enabled, file-based routing defined in `app/routes.ts`. Routes use the loader/action pattern for data fetching and mutations (no client-side state management library). Route types are auto-generated in `.react-router/types/` — import as `import type { Route } from "./+types/<route-name>"`.

Path alias: `~/*` maps to `./app/*`.

### Key Directories

- `app/routes/` — Route modules (loaders, actions, components)
- `app/components/` — React components including shadcn/ui primitives in `ui/`
- `app/lib/` — Server utilities (auth, password hashing, Zod validations)
- `app/db/` — Prisma client setup
- `prisma/` — Schema, migrations, seed script

### Database

PostgreSQL via Prisma ORM (`@prisma/adapter-pg`). Generated client is imported from `generated/prisma/client` (not `@prisma/client`). Requires `DATABASE_URL` in `.env`.

Core models: Tenant → Users, Groves, Harvests. Users have roles (OWNER, ADMIN, MEMBER). Groves track olive varieties via GroveVariety join model. Harvests track method via `HarvestMethod` enum (HAND, RAKE, MECHANICAL_SHAKER, VIBRATOR, NET).

### Multi-Tenancy

All dashboard loaders call `getSessionUser(request)` which returns the user with their `tenant` included. Data queries must always filter by `tenantId` from the authenticated user to enforce tenant isolation.

### Authentication

Session-based auth in `app/lib/auth.server.ts`. Tokens stored in DB with 30-day expiry, set as httpOnly cookies (`session_token`). Passwords hashed with Node.js crypto scrypt. Dashboard routes are protected via loader checks that redirect to `/login`.

### Form Validation

Forms use `react-hook-form` with `@hookform/resolvers/zod`. Zod schemas are defined in `app/lib/validations.ts` and reused for both client-side validation and server-side action parsing. When using `useForm` with Zod schemas that contain `.transform()` (like `numericField`), do **not** pass the output type as a generic parameter — omit the type parameter and let inference handle it.

### Internationalization (i18n)

Uses `remix-i18next` middleware + `react-i18next`. The language detection flow spans multiple files:

1. **Server middleware** (`app/middleware/i18next.ts`): `remix-i18next/middleware` runs on every request (attached in `app/root.tsx`). Checks the `lng` cookie first, then falls back to the browser `Accept-Language` header, then to `"hr"`.
2. **Root loader** (`app/root.tsx`): calls `getLocale(context)` to get the detected language, passes it to the client.
3. **Client hydration** (`app/entry.client.tsx`): initializes i18next with `I18nextBrowserLanguageDetector`, detection order `["htmlTag"]` — reads `<html lang="...">` set by the server.
4. **Server rendering** (`app/entry.server.tsx`): gets the i18next instance from middleware context (or creates a fallback) and wraps `ServerRouter` with `I18nextProvider`.

Translation files are in `app/locales/hr.ts` and `app/locales/en.ts`. The locale cookie (`lng`) is defined in `app/cookies.ts`. Zod validation messages use i18n translation keys (e.g., `"validationInvalidEmail"`), not literal strings.

### Styling

Tailwind CSS v4 with custom theme colors (forest green `#1b4019`, cream `#ede8d0`). UI components from shadcn/ui. Geist font via `@fontsource-variable/geist`.

### Deployment

Dockerfile included (Node 20 Alpine). PWA configured via `vite-plugin-pwa`.

### Route Patterns

CRUD routes follow a consistent naming convention:
- List: `dashboard.<resource>.tsx` (includes delete action via `intent` field in form data)
- Create: `dashboard.<resource>.new.tsx`
- Edit: `dashboard.<resource>.$<id>.edit.tsx`

Delete operations use an `AlertDialog` confirmation and are handled as actions on the list page (not separate routes), using `fetcher.submit({ intent: "delete<Resource>", <resource>Id: id }, { method: "post" })`.

All form pages include a back link to the parent list page, cancel/submit buttons, and `useFetcher` for form submission.
