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
- **Auth**: Replit Auth (web, cookie-based OIDC) + token-based auth via AsyncStorage (mobile) + Passkey (WebAuthn) login + 2FA (TOTP/SMS)
- **Two-Factor Auth**: TOTP (speakeasy) + SMS (Twilio if configured, dev-mode console log otherwise). If 2FA is enabled, the `/callback` redirects to `/verify-2fa` before creating a full session. Pending sessions stored in-memory Map with 5-min expiry. Routes: `GET/POST /api/auth/2fa/*`
- **Passkeys**: WebAuthn via @simplewebauthn/server; `passkey_credentials` table. Routes: `GET/POST /api/auth/passkey/*`
- **Liability**: Platform is a marketplace only; ToS disclaims liability for transport quality/damages/disputes
- **Admin features**: verify drivers, suspend users, view platform stats

## Database Schema (PostgreSQL)
Tables: `sessions`, `users`, `shipments`, `bids`, `bookings`, `conversations`, `messages`, `reviews`, `driver_routes`, `saved_drivers`, `condition_photos`, `tracking_checkpoints`, `passkey_credentials`, `sms_codes`

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
- Tracking: `/bookings/:id/tracking` (GET history, POST new checkpoint by driver only)
- Call: `/bookings/:id/call-request` (POST — initiates masked in-app call session)
- Messages: `/conversations`, `/messages`
- Reviews: `/reviews`
- Admin: `/admin/stats`, `/admin/users/:id/verify`, `/admin/users/:id/suspend`
- Price Estimate: `POST /price-estimate` — haversine distance-based price range, broker savings shown
- Driver Routes: `GET/POST /driver-routes`, `PATCH/DELETE /driver-routes/:id` — backhaul board
- Saved Drivers: `GET/POST /saved-drivers`, `DELETE /saved-drivers/:driverId`
- Condition Photos: `GET/POST /bookings/:bookingId/photos`

## Differentiating Features
1. **Backhaul Finder** — Drivers post planned routes; shippers match loads to trucks already heading their way
2. **Smart Price Estimator** — Real-time estimate with broker savings comparison built into hero
3. **Save & Rebook Drivers** — Shippers build their own carrier network; rebook trusted drivers directly
4. **Condition Photo Reports** — Timestamped photos at pickup and delivery protect both parties
5. **Pay-Per-Booking** — Drivers pay only when they win a job, not $150+/month subscriptions
6. **Broker Comparison Table** — Homepage shows side-by-side vs. traditional brokers

## Web App Pages
- `/` — Home with price estimator hero, feature grid, comparison table, testimonials
- `/shipments` — Browse open loads
- `/driver-routes` — Backhaul Finder board (new)
- `/saved-drivers` — Shipper's saved/favorite carrier network (new)
- `/post-load` — Multi-step shipment creation
- `/dashboard` — Role-based dashboard (shipper: my loads; driver: my jobs)
- `/bookings/:id` — Booking detail with condition photos
- `/messages` — Direct messaging
- `/profile` — Profile & settings
- `/admin` — Admin dashboard

## Mobile App Screens
- `(tabs)/index` — Browse loads + Backhaul Finder toggle (new)
- `(tabs)/my-loads` — Shipper's posted shipments
- `(tabs)/my-jobs` — Driver's bookings and bids
- `(tabs)/messages-tab` — Conversations list
- `(tabs)/account` — Profile, settings, role-specific features (saved drivers / post route)
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
