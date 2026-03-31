# CLAUDE.md

## Principles

- **Understand first, then act.** Read the relevant code, understand the conventions, then move with confidence.
- **Leave it better than you found it.** If you see something broken or inconsistent in code you're already touching, fix it. Don't walk past problems.
- **Ship quality, not quantity.** Do fewer things well. A clean, working solution beats a sprawling one.
- **Earn complexity.** Start with the obvious approach. Only add abstraction, indirection, or configurability when the code demands it — not when it might be useful someday.
- **Investigate, don't retry.** When something fails, understand why before trying again. Two blind retries is a wasted session.
- **Use your tools.** Spawn subagents for research. Search the codebase instead of guessing at file paths. Let the formatter handle formatting.
- **Record what you learn.** Append to the Log section below. One line, dated, specific. This is how you make the next session faster.

## Project

Midgard is a pnpm monorepo (Turbo, Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Biome). Norse mythology naming.

```
apps/
  admin/          → Dashboard (port 3000, authenticated)
  chat/           → Chat app (port 3001, authenticated)
packages/
  ui/             → Component library (Kata design system, 5-layer atomic, framework-agnostic)
  heimdall/       → Auth module (session, proxy, config) → talks to Bifrost backend
  sindri/         → Shared UI resources (auth pages, chat UI, theme)
```

## Stack

pnpm 10 · Turbo · Next.js 16 (App Router, Turbopack) · TypeScript 5.9 (strict) · React 19 · Tailwind CSS 4 · motion 12 · CVA · Biome (tabs, single quotes, no semicolons, 100-char) · tsup · Lefthook

## Commands

```sh
pnpm dev              # Start everything (hlidskjalf dashboard)
pnpm build            # Production build via Turbo
pnpm lint             # Check formatting + lint
pnpm lint:fix         # Auto-fix
pnpm check-types      # TypeScript check
pnpm --filter ui docs # Component showcase (port 3456)
```

## Preferences

- Types and interfaces above consts/functions (unless a type depends on a const).
- Blank lines between unrelated statements; related lines stay together.
- Dependencies flow inward. Shared packages never depend on app code.
- Extend before inventing. Prefer growing an existing module over creating a new one.
- Abstractions are extracted, not predicted. 2+ call sites earns a utility; one does not.

## Git

Imperative mood, atomic commits. Feature branches for non-trivial work. Never force-push shared branches. Review your own diff before committing.

## Log

Append new entries at the bottom. One line per lesson. Date + what you learned. This is the most important section — it compounds across sessions.

- 2026-03-14: Tailwind v4 needs explicit `@source` directives for workspace packages in each app's globals.css — missing = styles silently absent
- 2026-03-14: Base tsconfig only has `"lib": ["ES2022"]` — packages using DOM APIs must add `"DOM"` and `"DOM.Iterable"` locally
- 2026-03-14: `baseUrl` and `paths` in tsconfig resolve relative to the file defining them — keep these in each app's tsconfig, not in shared root configs
- 2026-03-14: Next.js 16 renamed middleware.ts → proxy.ts, exported function `middleware` → `proxy`
- 2026-03-14: Sindri tsup needs two entries: one for form hook (`clean: true`), one for client components with `'use client'` banner (`clean: false`)
- 2026-03-15: `useId()` breaks in dual-rendered trees (SidebarLayout renders sidebar twice for desktop/mobile) — use `useRef()` instead, omit LayoutGroup `id` prop
- 2026-03-15: `motion.div` `onDrag` type conflicts with React's `DragEventHandler` — don't spread arbitrary div props onto motion elements
- 2026-03-15: Don't call `scrollToBottom()` after `setState` — React hasn't committed yet. Use `useEffect` watching `messages.length`
- 2026-03-15: Unbatched EventEmitter emissions flood Ink renders — batch with `queueMicrotask()` to coalesce per I/O callback
- 2026-03-15: tsup `--watch` with `dts: true` and 30+ entry points hits heap limits — use `--no-dts` in dev mode
- 2026-03-15: SidebarLayout scroll container is NOT window — it's a `div` with `overflow-y-auto`. Walk up DOM to find nearest scrollable ancestor
- 2026-03-16: `asChild` pattern needs `React.cloneElement`, not object spread — spread drops refs and clobbers handlers
- 2026-03-16: Biome `noArrayIndexKey` fires even when index isn't used as a React `key` — suppress with targeted biome-ignore when index is for IDs in static lists
- 2026-03-16: Vercel Geist dark P3 OKLCH palette: 100-500 dark tints, 600 vivid accent (color aliases point here), 700-800 darker vivids, 900-1000 light shades
- 2026-03-16: Every ui component exports its prop types from index.ts (e.g., `InputProps`, `ButtonProps`) — always do this for new components
- 2026-03-17: Next.js font warning "Failed to find font override values for Google Sans" — fix with `adjustFontFallback: false` in font config
- 2026-03-25: Switched from Husky to Lefthook — config lives in `lefthook.yml` at repo root, `prepare` script runs `lefthook install`
- 2026-03-31: CVA `colorVariants` factory needs `as { [K in keyof T]: string | string[] }` cast — `nuri` uses `as const` which produces `readonly` tuples incompatible with CVA's mutable `string[]`
- 2026-03-31: `katachi.panel` can be passed directly as CVA `variants.size` — no need to re-enumerate each key, CVA accepts the record shape as-is
- 2026-03-31: tsup entry points can be derived from `package.json` exports via `Object.fromEntries` — keeps a single source of truth for subpath exports
