# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run in parallel)
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/autohaul run dev

# Typecheck
pnpm run typecheck                          # all packages
pnpm --filter @workspace/autohaul run typecheck  # single package

# Build
pnpm run build                              # typecheck + build all

# Database
pnpm --filter @workspace/db run push        # apply schema changes
pnpm --filter @workspace/db run push-force  # force push schema

# API code generation (run after modifying lib/api-spec/openapi.yaml)
pnpm --filter @workspace/api-spec run codegen
```

## Architecture

**pnpm monorepo** with two layers: `lib/` (shared libraries) and `artifacts/` (deployable apps).

### Shared Libraries (`lib/`)

- **`lib/api-spec`** — OpenAPI 3.1 YAML spec; source of truth for the API contract
- **`lib/api-zod`** — Zod validation schemas generated from the spec via Orval
- **`lib/api-client-react`** — React Query hooks generated from the spec via Orval
- **`lib/db`** — Drizzle ORM schema (14 tables) + PostgreSQL connection; schema split across `src/schema/*.ts` files
- **`lib/replit-auth-web`** — Replit OIDC auth wrapper; uses `api-client-react` internally

**Code generation flow**: Edit `lib/api-spec/openapi.yaml` → run `codegen` → `lib/api-zod` and `lib/api-client-react` are regenerated. Do not manually edit generated files.

### Applications (`artifacts/`)

| App | Port | Stack |
|-----|------|-------|
| `api-server` | 8080 | Express 5, Drizzle, Pino, Zod |
| `autohaul` | 5173 | React 19, Vite, TailwindCSS 4, shadcn/ui, Wouter, React Query |
| `autohaul-mobile` | — | Expo SDK 54, Expo Router, React Native 0.81.5 |
| `mockup-sandbox` | — | Vite React, same UI stack as `autohaul`; isolated design reference |

**`api-server`** consumes `lib/db` and `lib/api-zod`.
**`autohaul`** (web) consumes `lib/api-client-react` and `lib/replit-auth-web`.
**`autohaul-mobile`** consumes `lib/api-client-react` with token auth (AsyncStorage) instead of cookies.

### Authentication

Three auth mechanisms coexist:
- **Replit OAuth (OIDC)** — web app only, cookie-based sessions via `lib/replit-auth-web`
- **Passkeys (WebAuthn)** — web app, uses SimpleWebAuthn on both server and browser
- **Token auth** — mobile app only, JWT-style tokens stored in AsyncStorage

2FA is supported via TOTP (speakeasy) and SMS (Twilio).

### TypeScript

- Strict mode enabled everywhere; composite build via `tsconfig.json` project references
- Shared base config in `tsconfig.base.json` with `moduleResolution: bundler` and `customConditions: ["workspace"]`
- Each lib package must be built before artifacts that depend on it (`tsc --build` at root handles ordering)

### UI (Web)

- **Routing**: Wouter (not React Router)
- **Components**: shadcn/ui (Radix UI primitives) — components live in `artifacts/autohaul/src/components/ui/`
- **Styling**: TailwindCSS 4 with `@tailwindcss/vite` plugin
- **Path alias**: `@/` maps to `src/` in both `autohaul` and `mockup-sandbox`

### Dependency Management

Package versions are pinned in the `catalog` section of `pnpm-workspace.yaml`. Reference catalog entries (e.g., `"react": "catalog:"`) rather than hardcoding versions when adding dependencies.
