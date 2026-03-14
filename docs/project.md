# Project

> Last updated: 2026-03-14

Midgard is a pnpm monorepo managed by Turbo. It contains Next.js applications backed by shared auth, UI component, and animation-effect packages.

## Tech Stack

- **Package manager**: pnpm 10.x
- **Monorepo orchestration**: Turbo
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.9 (strict, ES2022 target, bundler resolution)
- **UI**: React 19, Tailwind CSS 4, Headless UI
- **Animation**: motion (framer-motion) 12.x
- **Icons**: @heroicons/react
- **Component variants**: class-variance-authority (CVA)
- **Linting/formatting**: Biome (tabs, single quotes, no semicolons, 100-char lines)
- **Bundling (packages)**: tsup
- **Git hooks**: Husky

## Workspace Layout

```
apps/
  mimir/          → Main web application (Next.js, port 3000)
  docs/           → Documentation dashboard (Next.js, port 3001)
packages/
  catalyst/       → Shared UI component library (Headless UI + Tailwind)
  heimdall/       → Shared authentication module (session, config, proxy)
  sindri/         → Shared UI resources (auth pages, form hooks, input components)
  reactbits/      → Animation/effect components (motion-based)
docs/             → Project documentation and agent knowledge base
```

Defined in `pnpm-workspace.yaml`. Turbo tasks configured in `turbo.json`.

## apps/mimir

Primary user-facing Next.js 16 application running on port 3000.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(dashboard)/` — Dashboard route group (main authenticated area)
- `app/(dashboard)/page.tsx` — Dashboard home
- `app/(dashboard)/users/page.tsx` — Users page
- `app/login/page.tsx` — Login page (re-exports from `sindri/login-page`)
- `app/register/page.tsx` — Registration page (re-exports from `sindri/register-page`)
- `lib/auth.ts` — Re-exports `getSession` from heimdall
- `proxy.ts` — Client-side fetch proxy config
- `next.config.ts` — Uses `withAuth` from heimdall to set up API/auth rewrites

**Depends on:** heimdall, sindri, catalyst, reactbits, @heroicons/react

## apps/docs

Documentation dashboard that renders markdown files from the root `docs/` directory. Runs on port 3001.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(docs)/layout.tsx` — Docs shell with sidebar navigation
- `app/(docs)/page.tsx` — Dashboard home (card grid of all docs)
- `app/(docs)/[slug]/page.tsx` — Individual doc page with markdown rendering
- `app/client.tsx` — Client-side sidebar/navbar shell
- `app/markdown.tsx` — Server-side markdown-to-HTML renderer with Shiki syntax highlighting
- `app/lib/docs.ts` — Reads and parses markdown files from `docs/` directory
- `app/lib/auth.ts` — Re-exports `getSession` from heimdall
- `middleware.ts` — Only protects guest routes (login); all docs are public unless `<!-- auth: required -->`

**Auth model:** Public by default. Files with `<!-- auth: required -->` at the top are hidden from unauthenticated users. Optional login via `/login`.

**Depends on:** heimdall, sindri, catalyst, @heroicons/react, shiki

## packages/heimdall

Shared authentication module for all Midgard apps. Provides session management, route protection middleware, and Next.js config helpers. Pure server-side — no UI components.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `heimdall` | `src/session.ts` | `getSession()` — fetch auth session from Bifrost |
| `heimdall/config` | `src/config.ts` | `withAuth()` — Next.js config wrapper (rewrites to Bifrost) |
| `heimdall/proxy` | `src/proxy.ts` | `proxy()` — Next.js middleware for route protection |

**Key files:**
- `src/session.ts` — `getSession()`: calls Bifrost backend using `BIFROST_URL` env var (default `http://localhost:4000`), forwards cookies via `next/headers`
- `src/config.ts` — `withAuth()`: adds URL rewrites for `/auth/:path*` and `/api/:path*` to Bifrost
- `src/proxy.ts` — `proxy()`: protected routes redirect unauthenticated users to `/login`; guest routes (`/login`, `/register`) redirect authenticated users to `/`

**tsup config:** Single build pass for server modules (session, config, proxy).

**Depends on:** (no workspace deps)

## packages/sindri

Shared UI resources — auth page components, form validation hook, and input components. Named after the master dwarf craftsman of Norse mythology.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `sindri/login-page` | `src/components/login-page.tsx` | `LoginPage` component |
| `sindri/register-page` | `src/components/register-page.tsx` | `RegisterPage` component |
| `sindri/password-input` | `src/components/password-input.tsx` | `PasswordInput` component with visibility toggle |
| `sindri/use-form` | `src/hooks/use-form.ts` | `useForm` hook with validators (required, email, minLength, matches) |

**Key files:**
- `src/components/login-page.tsx` — Login form with password visibility toggle
- `src/components/register-page.tsx` — Registration form with password visibility toggle
- `src/components/password-input.tsx` — `PasswordInput` component with eye/eye-slash toggle (HeroIcons)
- `src/hooks/use-form.ts` — Form validation hook with validators (required, email, minLength, matches)

**tsup config:** Two build passes — server modules (use-form) with `clean: true`, then client modules (login-page, register-page, password-input) with `'use client'` banner and `clean: false`.

**Depends on:** catalyst, reactbits, @heroicons/react

## packages/catalyst

Headless UI + Tailwind CSS component library with 28+ components. Uses `data-slot` attributes for styling hooks.

**Components:** alert, auth-layout, avatar, badge, button, checkbox, combobox, description-list, dialog, divider, dropdown, fieldset (Field, Label, Description, ErrorMessage, FieldGroup, Legend), heading, input (Input, InputGroup), link, listbox, navbar, pagination, radio, select, sidebar, sidebar-layout, stacked-layout, switch, table, text (Text, TextLink, Strong, Code)

**Depends on:** @headlessui/react, clsx, class-variance-authority, motion

## packages/reactbits

Animation and visual effect components built on motion (framer-motion).

**Components:**
- `ShinyText` — Animated gradient text with shine sweep effect

**Depends on:** motion

## External Services

- **Bifrost** — Auth backend (not in this repo). Reached via `BIFROST_URL` env var. Heimdall proxies `/auth/*` and `/api/*` requests to it.

## Root Config Files

| File | Purpose |
|---|---|
| `turbo.json` | Task graph: build, dev, lint, check-types |
| `tsconfig.base.json` | Shared TS config (strict, ES2022, bundler resolution, lib: ES2022 only — packages needing DOM must add it locally) |
| `biome.json` | Formatter + linter rules for all packages |
| `pnpm-workspace.yaml` | Workspace package locations |

## Common Commands

```sh
pnpm dev            # Start all packages in dev/watch mode
pnpm build          # Build everything via Turbo
pnpm lint           # Lint all packages
pnpm lint:fix       # Auto-fix lint and formatting issues
pnpm check-types    # TypeScript type checking across workspace
```
