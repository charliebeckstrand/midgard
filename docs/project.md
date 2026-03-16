# Project

> Last updated: 2026-03-15

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
  ui/             → New component library (atomic architecture, framework-agnostic)
  catalyst/       → Shared UI component library (Headless UI + Tailwind) — being replaced by ui
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

Chat application running on port 3002. Authenticated (same model as admin). Chat UI components and hooks live in `sindri/chat` for cross-app reuse.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(chat)/` — Chat route group (main authenticated area)
- `app/(chat)/page.tsx` — Chat home (empty state)
- `app/(chat)/types.ts` — App-local types (Chat for sidebar display)
- `app/(chat)/` uses `useChat` hook from `sindri/chat` for message state, SSE streaming, and sidebar actions
- `app/(chat)/client.tsx` — Client wrapper with SidebarLayout, sidebar with "New chat" + chat list
- `app/(chat)/[chatId]/page.tsx` — Server component fetching chat history
- `app/(chat)/[chatId]/chat-view.tsx` — Thin client wrapper bridging local hooks to `sindri/chat` ChatLayout
- `app/(chat)/sidebar-footer.tsx` — User dropdown with sign-out
- `app/login/page.tsx` — Login page (re-exports from `sindri/auth`)
- `proxy.ts` — Next.js proxy using `heimdall/proxy` (protects all routes)
- `next.config.ts` — Uses `withAuth` from heimdall

**API integration:**
- `GET /api/chat` — Fetches all chats for sidebar listing (Bifrost)
- `GET /api/chat/{chatId}` — Fetches a specific chat's messages (Bifrost)
- `POST /api/chat/{chatId}` — Sends messages to the chat and returns agent response (Bifrost handles persistence)

**Depends on:** heimdall, sindri, catalyst, reactbits, @heroicons/react

## apps/docs

Documentation dashboard that renders markdown files from the root `docs/` directory. Runs on port 3001.

**Key paths:**
- `app/layout.tsx` — Root layout
- `app/(docs)/layout.tsx` — Docs shell with sidebar navigation
- `app/(docs)/page.tsx` — Single-page view rendering all docs stacked with id anchors
- `app/(docs)/client.tsx` — Client-side sidebar/navbar shell with IntersectionObserver scroll tracking
- `app/markdown.tsx` — Server-side markdown-to-HTML renderer with Shiki syntax highlighting
- `app/docs.ts` — Reads and parses markdown files from `docs/` directory
- `proxy.ts` — Next.js proxy using `heimdall/proxy` with `protect: false` (public app, only redirects authenticated users away from `/login`)

**Auth model:** Public by default. Files with `<!-- auth: required -->` at the top are hidden from unauthenticated users. Optional login via `/login`.

**Doc categories:** The sidebar groups docs into two sections:
- **Guides** — Developer-facing: `getting-started.md`, `development.md`, `architecture.md`
- **Reference** — Technical reference: `project.md`, `decisions.md`, `patterns.md`, `commands.md`, `glossary.md`, `apis.md`, `env.md`, `dependencies.md`, `testing.md`, `errors.md`

Categories and ordering are defined in `app/docs.ts` via `GUIDE_DOCS` and `REFERENCE_DOCS`.

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

Shared UI resources — auth page components, chat UI components, form validation hook, design theme, and input components. Named after the master dwarf craftsman of Norse mythology.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `sindri/auth` | `src/auth/index.ts` | `LoginPage`, `RegisterPage`, `PasswordInput` components |
| `sindri/chat` | `src/chat/index.ts` | `ChatLayout`, `ChatComposer`, `ChatMessage`, `useChat`, `useScrollToBottom`, types |
| `sindri/theme.css` | `src/theme.css` | Shared design tokens (colors, fonts) for all apps |

**Key files:**
- `src/auth/login-page.tsx` — Login form with password visibility toggle
- `src/auth/register-page.tsx` — Registration form with password visibility toggle
- `src/auth/password-input.tsx` — `PasswordInput` component with eye/eye-slash toggle (HeroIcons)
- `src/auth/use-form.ts` — Form validation hook with validators (required, email, minLength, matches)
- `src/chat/layout.tsx` — Presentational chat layout (message list + composer)
- `src/chat/composer.tsx` — `ChatComposer` text input with send button (emits `onSend` event)
- `src/chat/message.tsx` — `ChatMessage` single message bubble display
- `src/chat/use-chat.ts` — `useChat` hook (message state, SSE streaming, new/delete chat actions)
- `src/chat/use-scroll-to-bottom.ts` — Auto-scroll hook for message lists
- `src/chat/types.ts` — `Chat` (DB type), `ChatContent` interface
- `src/theme.css` — Shared `@theme` block with custom color palette (oklch-based) and font config

**tsup config:** Entry points are `src/index.ts` and `src/*/index.ts`. External: next, react, react-dom, catalyst, reactbits, @heroicons/react, react-textarea-autosize.

**Depends on:** catalyst, reactbits, @heroicons/react, react-textarea-autosize, eventsource-parser

## packages/ui

New component library built from scratch with a five-layer atomic architecture. Framework-agnostic (no Next.js dependency), works with any React ecosystem via LinkProvider pattern.

**Architecture (dependencies flow strictly downward):**
- `core/` — createContext factory, framework-agnostic Link/LinkProvider
- `recipes/` — Composable style definitions (control, popover, overlay, item, motion)
- `hooks/` — Behavioral primitives (useOverlay, useMenuKeyboard, useControllable)
- `primitives/` — Reusable building blocks (Overlay, PopoverPanel, SlidePanel, icons, TouchTarget)
- `components/` — 25 component families

**Components:** alert, avatar, badge, button, checkbox, combobox, description-list, dialog, divider, dropdown, fieldset, heading, input, listbox, navbar, pagination, radio, select, sidebar, sidebar-layout, stacked-layout, switch, table, text, textarea

**Imports:** Consumers import from specific entry points: `ui/button`, `ui/dialog`, `ui/core`, `ui/recipes`, `ui/primitives`, `ui/hooks`

**Depends on:** clsx, class-variance-authority, motion

**Peer deps:** react ^18 || ^19

**Status:** Replaces `packages/catalyst/` once migration is complete.

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
