# Project

> Last updated: 2026-03-14

Midgard is a pnpm monorepo managed by Turbo. It contains Next.js applications backed by shared auth, UI component, and animation-effect packages.

## Tech Stack

- **Package manager**: pnpm 10.x
- **Monorepo orchestration**: Turbo
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.9 (strict, ES2022 target, bundler resolution)
- **UI**: React 19, Tailwind CSS 4
- **Animation**: motion (framer-motion) 12.x
- **Icons**: @heroicons/react
- **Component variants**: class-variance-authority (CVA)
- **Linting/formatting**: Biome (tabs, single quotes, no semicolons, 100-char lines)
- **Bundling (packages)**: tsup
- **Git hooks**: Husky

## Workspace Layout

```
apps/
  admin/          → Main web application (Next.js, port 3000)
  chat/           → Chat application (Next.js, port 3002)
  docs/           → Documentation dashboard (Next.js, port 3001)
packages/
  catalyst/       → Shared UI component library (Headless UI + Tailwind)
  heimdall/       → Shared authentication module (session, config, proxy)
  hlidskjalf/     → CLI dev tool (Ink + React terminal UI, manages workspace processes)
  sindri/         → Shared UI resources (auth pages, form hooks, theme, input components)
  reactbits/      → Animation/effect components (motion-based)
docs/             → Project documentation and agent knowledge base
```

Defined in `pnpm-workspace.yaml`. Turbo tasks configured in `turbo.json`.

## Adding a New App

To add a new Next.js app to the monorepo:

1. Create `apps/<name>/package.json` with dependencies on `heimdall`, `sindri`, `catalyst`, and shared devDependencies (see `apps/admin/package.json` as template)
2. Create `apps/<name>/tsconfig.json` extending `../../tsconfig.nextjs.json` with `baseUrl`, `paths`, and `include`
3. Create `apps/<name>/next.config.ts` using `withAuth` from `heimdall/config`
4. Create `apps/<name>/proxy.ts` using `proxy` from `heimdall/proxy` (set `protect: false` for public apps)
5. Create `apps/<name>/app/globals.css` importing `sindri/theme.css` and adding `@source` directives for sindri and catalyst
6. Create `apps/<name>/app/layout.tsx` with Inter font and metadata
7. Create `apps/<name>/app/login/page.tsx` re-exporting from `sindri/login-page`

No `postcss.config.mjs` needed — apps inherit from the root config.

## apps/admin

Primary user-facing Next.js 16 application running on port 3000.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(dashboard)/` — Dashboard route group (main authenticated area)
- `app/(dashboard)/page.tsx` — Dashboard home
- `app/(dashboard)/users/page.tsx` — Users page
- `app/login/page.tsx` — Login page (re-exports from `sindri/login-page`)
- `app/register/page.tsx` — Registration page (re-exports from `sindri/register-page`)
- `proxy.ts` — Next.js proxy using `heimdall/proxy` (protects all routes)
- `next.config.ts` — Uses `withAuth` from heimdall to set up API/auth rewrites

**Depends on:** heimdall, sindri, catalyst, reactbits, @heroicons/react

## apps/chat

Chat application running on port 3002. Authenticated (same model as admin).

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(chat)/` — Chat route group (main authenticated area)
- `app/(chat)/page.tsx` — Chat home (empty state)
- `app/(chat)/types.ts` — Shared types (User, Chat, ChatMessage, ClientChatMessage)
- `app/(chat)/hooks/` — Extracted hooks (use-scroll-to-bottom, use-chat-messages, use-chat-actions)
- `app/(chat)/client.tsx` — Client wrapper with SidebarLayout, sidebar with "New chat" + chat list
- `app/(chat)/[chatId]/page.tsx` — Individual chat page with message input/display
- `app/(chat)/sidebar-footer.tsx` — User dropdown with sign-out
- `app/login/page.tsx` — Login page (re-exports from `sindri/login-page`)
- `app/register/page.tsx` — Registration page (re-exports from `sindri/register-page`)
- `proxy.ts` — Next.js proxy using `heimdall/proxy` (protects all routes)
- `next.config.ts` — Uses `withAuth` from heimdall

**API integration:**
- `GET /api/chat` — Fetches all chats for sidebar listing
- `GET /api/chat/{chatId}` — Fetches a specific chat's messages
- `POST /api/chat/{chatId}` — Sends a message (creates chat on first message, appends on subsequent)

**Depends on:** heimdall, sindri, catalyst, reactbits, react-textarea-autosize, @heroicons/react

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
- `proxy.ts` — Next.js proxy using `heimdall/proxy` with `protect: false` (public app, only redirects authenticated users away from `/login`)

**Auth model:** Public by default. Files with `<!-- auth: required -->` at the top are hidden from unauthenticated users. Optional login via `/login`.

**Depends on:** heimdall, sindri, catalyst, @heroicons/react, shiki

## packages/heimdall

Shared authentication module for all Midgard apps. Provides session management, route protection proxy, and Next.js config helpers. Pure server-side — no UI components.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `heimdall` | `src/session.ts` | `getSession()` — fetch auth session from Bifrost |
| `heimdall/config` | `src/config.ts` | `withAuth()` — Next.js config wrapper (rewrites to Bifrost) |
| `heimdall/proxy` | `src/proxy.ts` | `proxy()` — Next.js proxy for route protection |
| `heimdall/user` | `src/user.ts` | `getUser()` — fetch authenticated user from Bifrost |

**Key files:**
- `src/session.ts` — `getSession()`: calls Bifrost backend using `BIFROST_URL` env var (default `http://localhost:4000`), forwards cookies via `next/headers`
- `src/config.ts` — `withAuth()`: adds URL rewrites for `/auth/:path*` and `/api/:path*` to Bifrost
- `src/proxy.ts` — `proxy(request, options)`: guest routes (`/login`, `/register`) redirect authenticated users to homepage; when `protect: true` (default), non-guest routes redirect unauthenticated users to `/login`

**tsup config:** Single build pass for server modules (session, config, proxy, user).

**Depends on:** (no workspace deps)

## packages/sindri

Shared UI resources — auth page components, form validation hook, design theme, and input components. Named after the master dwarf craftsman of Norse mythology.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `sindri/login-page` | `src/components/login-page.tsx` | `LoginPage` component |
| `sindri/register-page` | `src/components/register-page.tsx` | `RegisterPage` component |
| `sindri/password-input` | `src/components/password-input.tsx` | `PasswordInput` component with visibility toggle |
| `sindri/use-form` | `src/hooks/use-form.ts` | `useForm` hook with validators (required, email, minLength, matches) |
| `sindri/theme.css` | `src/theme.css` | Shared design tokens (colors, fonts) for all apps |

**Key files:**
- `src/components/login-page.tsx` — Login form with password visibility toggle
- `src/components/register-page.tsx` — Registration form with password visibility toggle
- `src/components/password-input.tsx` — `PasswordInput` component with eye/eye-slash toggle (HeroIcons)
- `src/hooks/use-form.ts` — Form validation hook with validators (required, email, minLength, matches)
- `src/theme.css` — Shared `@theme` block with custom color palette (oklch-based) and font config

**tsup config:** Two build passes — server modules (use-form) with `clean: true`, then client modules (login-page, register-page, password-input) with `'use client'` banner and `clean: false`. The CSS file (`theme.css`) is exported directly, not bundled by tsup.

**Depends on:** catalyst, reactbits, @heroicons/react

## packages/catalyst

Tailwind CSS component library with 28+ components. Uses `data-slot` attributes for styling hooks and `data-hover`/`data-active`/`data-focus`/`data-disabled` attributes managed via event handlers in `primitives.tsx`. Animations use `motion/react` (AnimatePresence, motion.div). No HeadlessUI dependency.

**Components:** alert, auth-layout, avatar, badge, button, checkbox, combobox, description-list, dialog, divider, dropdown, fieldset (Field, Label, Description, ErrorMessage, FieldGroup, Legend), heading, input (Input, InputGroup), link, listbox, navbar, pagination, primitives (InteractiveButton, InteractiveLink, useInteractiveHandlers, useClickOutside, useEscapeKey), radio, select, sidebar, sidebar-layout, stacked-layout, switch, table, text (Text, TextLink, Strong, Code)

**Depends on:** clsx, class-variance-authority, motion

## packages/hlidskjalf

CLI tool for managing and monitoring all workspace dev processes. Built with Ink (React for terminal) and React 18. Runs `pnpm --filter <name> run dev` for each workspace, displays a dashboard with process status and logs. Designed to be published to npm and used across multiple Turborepos.

**CLI flags:**
- `--title=<name>` — Custom title in the dashboard header (default: `hlidskjalf`)
- `--emoji=<emoji>` — Custom emoji shown when all processes are ready (default: mountain emoji)
- `--filter=<name>` — Only run specific workspaces (repeatable)
- `--exclude=<name>` — Exclude specific workspaces from discovery (repeatable)
- `--order=alphabetical|run` — Sort order for the process list

**Key files:**
- `src/index.tsx` — CLI entry point (argument parsing, Ink renderer)
- `src/app.tsx` — Main React component (state, event handling, keyboard input)
- `src/processes.ts` — `ProcessRunner` class (child process management, log parsing, error recovery)
- `src/workspaces.ts` — Workspace discovery and dependency sorting
- `src/parser.ts` — Log line parsing (status detection, URL extraction, ANSI stripping)
- `src/views/dashboard.tsx` — Terminal UI dashboard (process table + log panel)
- `src/views/loading.tsx` — Loading screen

**Depends on:** ink, react (18.3.1)

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
| `tsconfig.nextjs.json` | Shared TS config for Next.js apps (extends base, adds JSX, DOM libs, Next.js plugin). Apps extend this and add their own `baseUrl`, `paths`, and `include`. |
| `postcss.config.mjs` | PostCSS config with Tailwind CSS plugin — shared by all apps (Next.js auto-discovers it up the directory tree) |
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
