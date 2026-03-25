# Architecture Overview

How the pieces of Midgard fit together.

## System Diagram

```
┌──────────────────────────────────────────────┐
│                    Midgard                    │
│                                               │
│  ┌──────────┐  ┌──────────┐                  │
│  │  Admin   │  │   Chat   │                  │
│  │  :3000   │  │  :3001   │                  │
│  └────┬─────┘  └────┬─────┘                  │
│       │              │                        │
│  ┌────┴──────────────┴─────────────────┐     │
│  │       Shared Packages               │     │
│  │  ui · sindri · reactbits            │     │
│  └────────────────┬────────────────────┘     │
│                   │                           │
│  ┌────────────────┴────────────────────┐     │
│  │       heimdall (auth)               │     │
│  └────────────────┬────────────────────┘     │
└───────────────────┼──────────────────────────┘
                    │
            ┌───────┴───────┐
            │   Bifrost     │
            │  (auth API)   │
            └───────────────┘
```

## Apps

**Admin** — The primary user-facing dashboard. Protected by authentication. Provides user management, settings, and the main application experience.

**Chat** — A real-time chat application. Protected by authentication. Features message history, auto-scrolling, and a sidebar with chat list. All chat UI components and hooks live in `sindri/chat` for cross-app reuse.

## Shared Packages

**ui** — Component library built on **Kata** (型, "form") — a recipe-based design system where every visual decision flows from a shared vocabulary of composable style primitives. Kata's ten recipes encode the full spectrum of visual concern — color, space, shape, interaction, motion — so that components inherit consistency by construction rather than convention.

The library follows a five-layer atomic architecture (core → recipes → hooks → primitives → components), is framework-agnostic via a LinkProvider pattern, and ships 29 component families with zero cross-component duplication.

**Kata Recipes:**

| Recipe | Kanji | Meaning | Concern |
| ------ | ----- | ------- | ------- |
| Sumi | 墨 | Ink | Text and foreground color — the marks on the surface |
| Kage | 影 | Shadow | Edges and borders — the lines that define form |
| Nuri | 塗り | Lacquer | Painted fills — button, badge, checkbox, and switch palettes |
| Omote | 面 | Surface | Backgrounds and chrome — panels, cards, controls, overlays |
| Ki | 気 | Energy | Focus rings and interaction feedback |
| Sawari | 触り | Touch | Hover, press, and cursor response |
| Ugoki | 動き | Movement | Transitions and animation |
| Ma | 間 | Space | Padding and breathing room — the emptiness that gives form meaning |
| Katachi | 形 | Shape | Dimensions and proportion — icon sizes, panel widths, border radii |
| Narabi | 並び | Arrangement | Layout and positioning — how elements relate in space |

Each recipe is a plain object of Tailwind class strings. Components compose them — `cn(omote.control, ma.control, kage.ring)` — rather than redeclaring styles. When a recipe changes, every component that references it updates in lockstep.

Includes consolidated `layouts/` (AuthLayout, SidebarLayout with OffcanvasContext) and `pages/` (LoginPage, RegisterPage, ForgotPasswordPage skeletons). Ships a Vite-powered component showcase at `src/docs/` (port 3456, `pnpm --filter ui docs`) with 22 demo files auto-discovered via `import.meta.glob`; excluded from the library build.

**heimdall** — Server-side authentication module. Provides session management (`getSession`), route protection (`proxy`), and Next.js config helpers (`withAuth`). Proxies auth and API requests to the external Bifrost backend.

**sindri** — Shared UI resources including auth page components (login, register), chat UI components (layout, composer, message display), form validation (`useForm`), and the shared CSS theme.

**reactbits** — Animation and visual effect components built on motion (framer-motion).

**hlidskjalf** — A terminal dashboard CLI that discovers workspace packages and runs their dev scripts simultaneously, displaying status and logs in a unified view.

## Key Design Decisions

- **Dependencies flow inward.** Apps depend on packages, never the reverse. Packages never depend on app code.
- **Auth is centralized.** Authenticated apps use heimdall, which proxies to Bifrost. Apps only need to call `getSession()` or `getUser()`.
- **Extend before inventing.** Prefer growing an existing module over creating a new one unless there's a clear, distinct boundary.
- **Abstractions are extracted, not predicted.** A pattern must appear in 2+ places before it earns a shared utility.

See [Architecture Decisions](#decisions) for the full record of design choices.

## Naming Convention

The project uses **Norse mythology** for infrastructure and **Japanese craft vocabulary** for the design system.

**Norse (infrastructure):**

| Name       | Meaning                  | Role                   |
| ---------- | ------------------------ | ---------------------- |
| Midgard    | Human realm              | The monorepo           |
| Heimdall   | Watchman of the gods     | Auth module            |
| Bifrost    | Rainbow bridge to Asgard | External auth backend  |
| Sindri     | Master dwarf craftsman   | Shared UI resources    |
| Hlidskjalf | Odin's watchtower        | Terminal dev dashboard |

**Japanese (design system — Kata):**

| Name    | Kanji | Meaning     | Concern                           |
| ------- | ----- | ----------- | --------------------------------- |
| Kata    | 型    | Form        | The recipe system itself           |
| Sumi    | 墨    | Ink         | Text and foreground color          |
| Kage    | 影    | Shadow      | Edges and borders                  |
| Nuri    | 塗り  | Lacquer     | Painted fills and color palettes   |
| Omote   | 面    | Surface     | Backgrounds, chrome, overlays      |
| Ki      | 気    | Energy      | Focus rings and interaction states |
| Sawari  | 触り  | Touch       | Hover, press, and cursor response  |
| Ugoki   | 動き  | Movement    | Transitions and animation          |
| Ma      | 間    | Space       | Padding and breathing room         |
| Katachi | 形    | Shape       | Dimensions, proportion, radii      |
| Narabi  | 並び  | Arrangement | Layout and positioning             |
