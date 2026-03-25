# AutoHaul Connect — Workspace

## Overview

AutoHaul Connect is a direct auto transport marketplace that connects shippers (individuals/dealers) with drivers, eliminating middlemen/brokers. Built as a pnpm monorepo with TypeScript.

## Platform Architecture

### Artifacts
1. **`artifacts/api-server`** — Express 5 API backend (port 8080)
2. **`artifacts/autohaul`** — React + Vite web app (Replit Auth, full feature set)
3. **`artifacts/autohaul-mobile`** — Expo React Native mobile app (iOS/Android)

### Shared Libraries
- **`lib/api-spec`** — OpenAPI 3.1 spec + Orval codegen config
- **`lib/api-client-react`** — Generated React Query hooks + fetch client
- **`lib/api-zod`** — Generated Zod schemas (with mobile auth types added manually)
- **`lib/db`** — Drizzle ORM schema + PostgreSQL connection

## Key Design Decisions
- **No payment processing** — payment arranged directly between driver and shipper
- **Roles**: shipper, driver, both, admin — selectable in profile
- **Auth**: Replit Auth (web, cookie-based OIDC) + token-based auth via AsyncStorage (mobile)
- **Liability**: Platform is a marketplace only; ToS disclaims liability for transport quality/damages/disputes
- **Admin features**: verify drivers, suspend users, view platform stats

## Database Schema (PostgreSQL)
Tables: `sessions`, `users`, `shipments`, `bids`, `bookings`, `conversations`, `messages`, `reviews`

### Important: DB Schema Index
`lib/db/src/schema/index.ts` selectively exports to avoid duplicate `usersTable`:
- `sessionsTable` from `auth.ts` (Replit Auth requirement)
- Everything else from individual schema files (users.ts is the primary `usersTable`)

## API Endpoints (all under `/api`)
- Auth: `/auth/user`, `/login`, `/callback`, `/logout`, `/mobile-auth/token-exchange`, `/mobile-auth/logout`
- Users: `/users/me`, `/users/me/profile`, `/users/:id`
- Shipments: `/shipments` (CRUD), `/shipments/:id/bids`
- Bids: `/bids`, `/bids/:id/accept`
- Bookings: `/bookings`, `/bookings/:id`, status updates
- Messages: `/conversations`, `/messages`
- Reviews: `/reviews`
- Admin: `/admin/stats`, `/admin/users/:id/verify`, `/admin/users/:id/suspend`

## Mobile App Screens
- `(tabs)/index` — Browse available loads
- `(tabs)/my-loads` — Shipper's posted shipments
- `(tabs)/my-jobs` — Driver's bookings and bids
- `(tabs)/messages-tab` — Conversations list
- `(tabs)/account` — Profile and settings
- `auth` — Sign in screen
- `shipment/[id]` — Load detail + bid placement
- `messages/[conversationId]` — Chat thread
- `booking/[id]` — Booking detail + status updates
- `create-shipment` — Multi-step load posting form
- `profile-setup` — Profile edit modal

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Web**: React 19 + Vite + TailwindCSS + shadcn/ui + React Query + wouter
- **Mobile**: Expo SDK 54 + Expo Router + NativeTabs (liquid glass on iOS 26+) + React Query
- **Build**: esbuild (API), Vite (web), Metro (mobile)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Always typecheck from root: `pnpm run typecheck`.

## Development Workflows

- API server: `pnpm --filter @workspace/api-server run dev`
- Web app: `pnpm --filter @workspace/autohaul run dev`
- Mobile: `pnpm --filter @workspace/autohaul-mobile run dev`
- DB push: `pnpm --filter @workspace/db run push`
- API codegen: `pnpm --filter @workspace/api-spec run codegen`
