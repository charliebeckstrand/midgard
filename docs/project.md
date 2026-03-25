# Project

> Last updated: 2026-03-17

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
- **Git hooks**: Lefthook

## Workspace Layout

```
apps/
  admin/          → Main web application (Next.js, port 3000)
  chat/           → Chat application (Next.js, port 3001)
packages/
  ui/             → New component library (atomic architecture, framework-agnostic)
  heimdall/       → Shared authentication module (session, config, proxy)
  hlidskjalf/     → CLI dev tool (Ink + React terminal UI, manages workspace processes)
  sindri/         → Shared UI resources (auth pages, form hooks, theme, input components)
  reactbits/      → Animation/effect components (motion-based)
docs/             → Project documentation and agent knowledge base
```

Defined in `pnpm-workspace.yaml`. Turbo tasks configured in `turbo.json`.

## Adding a New App

To add a new Next.js app to the monorepo:

1. Create `apps/<name>/package.json` with dependencies on `sindri`, `ui`, and shared devDependencies (see `apps/admin/package.json` as template)
2. Create `apps/<name>/tsconfig.json` extending `../../tsconfig.nextjs.json` with `baseUrl`, `paths`, and `include`
3. Create `apps/<name>/next.config.ts` (use `withAuth` from `heimdall/config` only if the app requires authentication)
4. If authenticated: create `apps/<name>/proxy.ts` using `proxy` from `heimdall/proxy`, and add `heimdall` to dependencies
5. Create `apps/<name>/app/globals.css` importing `sindri/theme.css` and adding `@source` directives for sindri and ui
6. Create `apps/<name>/app/layout.tsx` with Inter font and metadata
7. If authenticated: create `apps/<name>/app/login/page.tsx` re-exporting from `sindri/auth`

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

**Depends on:** heimdall, sindri, ui, reactbits, @heroicons/react

## apps/chat

Chat application running on port 3001. Authenticated (same model as admin). Chat UI components and hooks live in `sindri/chat` for cross-app reuse.

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

**Depends on:** heimdall, sindri, ui, reactbits, @heroicons/react

## packages/heimdall

Shared authentication module for all Midgard apps. Provides session management, route protection proxy, and Next.js config helpers. Pure server-side — no UI components.

**Exports:**
| Import path | File | Purpose |
|---|---|---|
| `heimdall` | `src/index.ts` | `getSession()`, `getUser()`, `bifrost()`, `withAuth()`, `proxy()` — barrel re-export |
| `heimdall/config` | `src/config.ts` | `withAuth()` — Next.js config wrapper (rewrites to Bifrost) |
| `heimdall/proxy` | `src/proxy.ts` | `proxy()` — Next.js proxy for route protection |
| `heimdall/user` | `src/user.ts` | `getUser()` — fetch authenticated user from Bifrost |

**Key files:**
- `src/fetch.ts` — `bifrost()`: base fetch helper calling Bifrost backend using `BIFROST_URL` env var, forwards cookies via `next/headers`
- `src/session.ts` — `getSession()`: checks auth session via `bifrost()`
- `src/config.ts` — `withAuth()`: adds URL rewrites for `/auth/:path*` and `/api/:path*` to Bifrost
- `src/proxy.ts` — `proxy(request, options)`: guest routes (`/login`, `/register`) redirect authenticated users to homepage; when `protect: true` (default), non-guest routes redirect unauthenticated users to `/login`

**tsup config:** Single build pass for server modules (index, config, proxy, user). Internal modules (`fetch.ts`, `session.ts`) are bundled into consumers via `splitting: false`.

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
- `src/auth/login-page.tsx` — Login form wrapping `ui/pages` LoginPage skeleton with form state, validation, and routing
- `src/auth/register-page.tsx` — Registration form wrapping `ui/pages` RegisterPage skeleton with form state, validation, and routing
- `src/auth/password-input.tsx` — `PasswordInput` component with eye/eye-slash toggle (HeroIcons)
- `src/auth/use-form.ts` — Form validation hook with validators (required, email, minLength, matches)
- `src/chat/layout.tsx` — Presentational chat layout (message list + composer)
- `src/chat/composer.tsx` — `ChatComposer` text input with send button (emits `onSend` event)
- `src/chat/message.tsx` — `ChatMessage` single message bubble display
- `src/chat/use-chat.ts` — `useChat` hook (message state, SSE streaming, new/delete chat actions)
- `src/chat/use-scroll-to-bottom.ts` — Auto-scroll hook for message lists
- `src/chat/types.ts` — `Chat` (DB type), `ChatContent` interface
- `src/theme.css` — Shared `@theme` block with custom color palette (oklch-based) and font config

**tsup config:** Entry points are `src/index.ts` and `src/*/index.ts`. External: next, react, react-dom, ui, reactbits, @heroicons/react, react-textarea-autosize.

**Depends on:** ui, reactbits, @heroicons/react, react-textarea-autosize, eventsource-parser

## packages/ui

Component library built on **Kata** (型) — a recipe-based design system where composable style primitives replace scattered Tailwind strings with a shared visual vocabulary. Framework-agnostic (no Next.js dependency), works with any React ecosystem via LinkProvider pattern.

**Architecture (dependencies flow strictly downward):**
- `core/` — createContext factory, framework-agnostic Link/LinkProvider
- `recipes/` — **Kata** — ten composable style modules: Sumi (ink/text), Kage (edges), Nuri (fills), Omote (surfaces), Ki (focus), Sawari (touch), Ugoki (motion), Ma (space), Katachi (shape), Narabi (arrangement)
- `hooks/` — Behavioral primitives (useOverlay, useMenuKeyboard, useControllable)
- `primitives/` — Reusable building blocks (Overlay, PopoverPanel, icons, TouchTarget)
- `components/` — 29 component families + layouts + pages

**Components:** alert, avatar, badge, button, checkbox, combobox, description-list, dialog, divider, dropdown, fieldset, heading, input, listbox, navbar, pagination, placeholder, radio, select, sheet, sidebar, switch, table, tabs, text, textarea

**Layouts (`ui/layouts`):** AuthLayout, SidebarLayout — shared layout shells. SidebarLayout uses the Sheet component (side="left") for the mobile sidebar. `OffcanvasContext` allows nested components (SidebarItem, SidebarHeader) to close the offcanvas panel.

**Pages (`ui/pages`):** LoginPage, RegisterPage, ForgotPasswordPage — presentational page skeletons (structure + heading + submit button). Sindri wraps these with form state, validation, and routing logic.

**Imports:** Consumers import from specific entry points: `ui/button`, `ui/dialog`, `ui/layouts`, `ui/pages`, `ui/core`, `ui/recipes`, `ui/primitives`, `ui/hooks`

**Prop type exports:** Every component index file exports its prop types (e.g., `InputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `SwitchProps`, `RadioProps`, `AvatarProps`, `BadgeProps`, `HeadingProps`, `LoginPageProps`, `RegisterPageProps`, `ForgotPasswordPageProps`). This allows consumers to build wrappers without re-declaring prop shapes.

**Tree-shaking:** `package.json` includes `"sideEffects": false`, enabling bundlers to eliminate unused component code.

**Component showcase (`src/docs/`):** A Vite-powered development app that auto-discovers demo files via `import.meta.glob('./demos/*.tsx', { eager: true })`. Each demo exports a default component and an optional `meta` object (`{ name, category }`). Uses SidebarLayout with hash-based routing and Tabs component for Preview/Code/API views. Runs on port 3456 via `pnpm --filter ui docs`. Demo files covering all components, organized into categories: Forms, Data Display, Feedback, Overlay, Navigation, Layout. Excluded from the tsup build and tsc via `tsconfig.json` exclude. Dev dependencies: vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, react-dom.

**Prop parser (`src/docs/parse-props/`):** Extracts component prop types from TypeScript source for the API tab in the showcase. Modular architecture: `scanner.ts` (token scanner), `cva.ts` (CVA variant resolution), `parse-source.ts` (source parsing with balanced paren matching and intersection type handling), `types.ts` (shared types), `index.ts` (public API).

**Depends on:** clsx, class-variance-authority, motion

**Peer deps:** react ^18 || ^19

**Status:** Active. Replaced the former `packages/catalyst/` library.

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
