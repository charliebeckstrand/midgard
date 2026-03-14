# Project

> Last updated: 2026-03-13

Midgard is a pnpm monorepo managed by Turbo. It contains a Next.js application backed by a shared auth module and a shared UI component library.

## Tech Stack

- **Package manager**: pnpm 10.x
- **Monorepo orchestration**: Turbo
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.9 (strict, ES2022 target, bundler resolution)
- **UI**: React 19, Tailwind CSS 4
- **Component variants**: class-variance-authority (CVA)
- **Linting/formatting**: Biome (tabs, single quotes, no semicolons, 100-char lines)
- **Bundling (packages)**: tsup
- **Git hooks**: Husky

## Workspace Layout

```
apps/
  mimir/          → Main web application (Next.js)
packages/
  heimdall/       → Shared authentication module
  rune/           → Shared UI component library
```

Defined in `pnpm-workspace.yaml`. Turbo tasks configured in `turbo.json`.

## apps/mimir

Primary user-facing Next.js 16 application running on port 3000.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(dashboard)/` — Dashboard route group (main authenticated area)
- `app/(dashboard)/page.tsx` — Dashboard home
- `app/(dashboard)/logout-button.tsx` — Logout action
- `app/login/page.tsx` — Login page
- `app/register/page.tsx` — Registration page
- `lib/auth.ts` — Re-exports `getSession` from heimdall
- `proxy.ts` — Client-side fetch proxy config
- `next.config.ts` — Uses `withAuth` from heimdall to set up API/auth rewrites

**Depends on:** heimdall, rune

## packages/heimdall

Shared authentication module for all Midgard apps. Provides session management, route protection middleware, and Next.js config helpers.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `heimdall` | `src/index.ts` | `getSession()` — fetch auth session from Bifrost |
| `heimdall/config` | `src/config.ts` | `withAuth()` — Next.js config wrapper (rewrites to Bifrost) |
| `heimdall/proxy` | `src/proxy.ts` | `proxy()` — Next.js middleware for route protection |
| `heimdall/pages` | `src/pages.ts` | Login and register page components |

**Key files:**
- `src/index.ts` — `getSession()`: calls Bifrost backend using `BIFROST_URL` env var (default `http://localhost:4000`), forwards cookies via `next/headers`
- `src/config.ts` — `withAuth()`: adds URL rewrites for `/auth/:path*` and `/api/:path*` to Bifrost
- `src/proxy.ts` — `proxy()`: protected routes redirect unauthenticated users to `/login`; guest routes (`/login`, `/register`) redirect authenticated users to `/`
- `src/pages.tsx` — `LoginPage`, `RegisterPage`: auth form components

**Depends on:** rune (for form UI)

## packages/rune

Geist-inspired UI component library. Each component exports a component, props type, and CVA variants function.

**Components:** button, card, form, input, label, link, sidebar

**Shared types** (`src/types/index.ts`):
- `Size`: `'tiny' | 'small' | 'medium' | 'large'`
- `Type`: `'default' | 'secondary' | 'warning' | 'error' | 'tertiary'`

**Tests:** `__tests__/` directory with tests for button, card, form

**Depends on:** class-variance-authority

## External Services

- **Bifrost** — Auth backend (not in this repo). Reached via `BIFROST_URL` env var. Heimdall proxies `/auth/*` and `/api/*` requests to it.

## Root Config Files

| File | Purpose |
|---|---|
| `turbo.json` | Task graph: build, dev, lint, check-types |
| `tsconfig.base.json` | Shared TS config (strict, ES2022, bundler resolution) |
| `biome.json` | Formatter + linter rules for all packages |
| `tsup.config.ts` | Bundle config for library packages |
| `pnpm-workspace.yaml` | Workspace package locations |

## Common Commands

```sh
pnpm dev            # Start all packages in dev/watch mode
pnpm build          # Build everything via Turbo
pnpm lint           # Lint all packages
pnpm lint:fix       # Auto-fix lint and formatting issues
pnpm check-types    # TypeScript type checking across workspace
```
