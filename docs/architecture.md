# Architecture Overview

How the pieces of Midgard fit together.

## System Diagram

```
┌─────────────────────────────────────────────────┐
│                    Midgard                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Admin   │  │   Chat   │  │   Docs   │      │
│  │  :3000   │  │  :3002   │  │  :3001   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│  ┌────┴──────────────┴──────────────┴─────┐     │
│  │         Shared Packages                 │     │
│  │  ui · sindri · reactbits                │     │
│  └────────────────┬───────────────────────┘     │
│                   │                              │
│  ┌────────────────┴───────────────────────┐     │
│  │            heimdall (auth)              │     │
│  └────────────────┬───────────────────────┘     │
└───────────────────┼─────────────────────────────┘
                    │
            ┌───────┴───────┐
            │   Bifrost     │
            │  (auth API)   │
            └───────────────┘
```

## Apps

**Admin** — The primary user-facing dashboard. Protected by authentication. Provides user management, settings, and the main application experience.

**Chat** — A real-time chat application. Protected by authentication. Features message history, auto-scrolling, and a sidebar with chat list. All chat UI components and hooks live in `sindri/chat` for cross-app reuse.

**Docs** — A public documentation dashboard. Renders markdown files from the `docs/` directory with syntax highlighting and anchor-based navigation. No auth required to view.

## Shared Packages

**ui** — Component library with five-layer atomic architecture (core → recipes → hooks → primitives → components). Framework-agnostic via LinkProvider pattern. 29 component families, zero duplication through shared recipes and primitives. Includes consolidated `layouts/` (AuthLayout, SidebarLayout, StackedLayout with shared MobileSidebar) and `pages/` (LoginPage, RegisterPage, ForgotPasswordPage skeletons). Ships a Vite-powered component showcase at `src/docs/` (port 3456, `pnpm --filter ui docs`) with 22 demo files auto-discovered via `import.meta.glob`; excluded from the library build.

**heimdall** — Server-side authentication module. Provides session management (`getSession`), route protection (`proxy`), and Next.js config helpers (`withAuth`). Proxies auth and API requests to the external Bifrost backend.

**sindri** — Shared UI resources including auth page components (login, register), chat UI components (layout, composer, message display), form validation (`useForm`), and the shared CSS theme.

**reactbits** — Animation and visual effect components built on motion (framer-motion).

**hlidskjalf** — A terminal dashboard CLI that discovers workspace packages and runs their dev scripts simultaneously, displaying status and logs in a unified view.

## Key Design Decisions

- **Dependencies flow inward.** Apps depend on packages, never the reverse. Packages never depend on app code.
- **Auth is centralized.** All authentication flows through heimdall, which proxies to Bifrost. Apps only need to call `getSession()` or `getUser()`.
- **Extend before inventing.** Prefer growing an existing module over creating a new one unless there's a clear, distinct boundary.
- **Abstractions are extracted, not predicted.** A pattern must appear in 2+ places before it earns a shared utility.

See [Architecture Decisions](#decisions) for the full record of design choices.

## Naming Convention

The project uses **Norse mythology** names:

| Name         | Meaning                    | Role                        |
| ------------ | -------------------------- | --------------------------- |
| Midgard      | Human realm                | The monorepo                |
| Heimdall     | Watchman of the gods       | Auth module                 |
| Bifrost      | Rainbow bridge to Asgard   | External auth backend       |
| Sindri       | Master dwarf craftsman     | Shared UI resources         |
| Hlidskjalf   | Odin's watchtower          | Terminal dev dashboard       |

| Reactbits   | Animation components       | Visual effects package      |
