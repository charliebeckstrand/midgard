# Hard-Won Knowledge

Mistakes, failed approaches, and surprising behavior. Each entry should prevent a future session from repeating it.

## 2026-03-14 — Tailwind CSS v4 requires explicit @source directives

Tailwind CSS v4 in apps does not auto-detect classes from workspace packages. Every workspace package whose source files contain Tailwind `className` strings must be explicitly listed with `@source '../../../packages/<name>/src'` in `globals.css`. This includes `catalyst`, `heimdall`, and any future package. Missing a package silently omits those classes — there is no error, the styles just don't appear.

## 2026-03-14 — Base tsconfig lacks DOM types

The root `tsconfig.base.json` only includes `"lib": ["ES2022"]`. Packages that use browser APIs (IntersectionObserver, DOM types) must add `"lib": ["ES2022", "DOM", "DOM.Iterable"]` in their own tsconfig.

## 2026-03-14 — Heimdall tsup has two build passes (outdated — see Sindri)

~~Heimdall uses two tsup config entries.~~ After the Sindri extraction, Heimdall has a single build pass for server modules only. **Sindri** now uses two tsup config entries: one for the form hook (use-form) with `clean: true`, and one for client components (login-page, register-page, password-input) with `'use client'` banner and `clean: false`. New client-side UI files go in Sindri's second entry.

## 2026-03-14 — Next.js 16 renamed middleware.ts to proxy.ts

Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. The file must be named `proxy.ts` at the app root, and it must export a function named `proxy` (not `middleware`). The old `middleware.ts` convention still works for edge runtime but is deprecated. See: https://nextjs.org/docs/messages/middleware-to-proxy

## 2026-03-15 — useId() causes hydration mismatches with dual-rendered or conditionally-mounted components

`useId()` generates IDs based on component tree position during rendering. Two patterns break it:

1. **Dual rendering**: `SidebarLayout` renders `{sidebar}` twice (desktop + mobile drawer). Components inside sidebar that call `useId()` (e.g., `LayoutGroup`, `Dropdown`) get different IDs because the tree structure differs between SSR and client hydration.

2. **Conditional mounting with AnimatePresence**: `{open && <Component />}` inside `AnimatePresence` means the component mounts on SSR but not on client (if `open` starts as `false`), shifting `useId()` numbering for all subsequent components.

**Failed approaches**: (a) Always-mounting the mobile panel with `motion.animate` visibility — didn't fix it because `LayoutGroup` and `Dropdown` still used `useId()` internally. (b) Rendering sidebar once with CSS breakpoints — caused visual bugs (sidebar visibly sliding on mobile).

**Fix**: Remove all `useId()` calls from components that appear in dual-rendered trees. Use `useRef()` instead for DOM references, and let `LayoutGroup` auto-generate its own IDs (omit the `id` prop). For ARIA linkage (e.g., `aria-labelledby`), prefer ref-based approaches or omit when the pattern still works without explicit ID linkage.

## 2026-03-15 — motion.div onDrag type conflicts with React's onDrag

When spreading `React.ComponentPropsWithoutRef<'div'>` onto a `motion.div`, the `onDrag` types conflict — React's `DragEventHandler` is incompatible with motion's `(event: PointerEvent, info: PanInfo) => void`. Fix: don't spread arbitrary div props onto motion elements, or explicitly omit `onDrag` from the type.

## 2026-03-15 — Scroll-after-setState requires useEffect, not synchronous call

Calling `scrollToBottom()` immediately after `setMessages(newMessages)` doesn't work because React hasn't committed the update to the DOM yet. The new message element doesn't exist when scroll fires. Fix: use `useEffect` watching `messages.length` so scroll happens after React commits the DOM update.

## 2026-03-15 — Unbatched EventEmitter emissions cause render flooding in Ink apps

Hlidskjalf's `ProcessRunner` emitted a `change` event for every single log line from every child process. With 8+ processes logging simultaneously, this caused hundreds of React state updates per second in the Ink terminal UI, each triggering a full re-sort and re-render of the dashboard. Fix: batch emissions with `queueMicrotask()` — multiple synchronous log lines within a single I/O callback coalesce into one `change` event.

## 2026-03-15 — tsup DTS generation in watch mode is a memory hog

tsup's `dts: true` spawns a TypeScript worker thread for declaration generation. With 30+ entry points (like catalyst), this worker needs to type-check the entire project on every rebuild, easily hitting Node.js heap limits. In dev/watch mode, use `--no-dts` since consumers use source TypeScript imports anyway (via `"types": "./src/index.ts"` in package.json exports).

## 2026-03-15 — SidebarLayout scroll container is NOT window

The `SidebarLayout` component renders content inside a `div` with `overflow-y-auto` (when `scrollable=true`, the default). On desktop, this inner div is the actual scroll container — `window.scroll` events never fire. Any scroll-tracking hook must find the real scroll container by walking up the DOM to the nearest `overflow-y: auto|scroll` ancestor. Use `getComputedStyle(node).overflowY` to detect it, with `document.documentElement` as fallback.

## 2026-03-14 — tsconfig baseUrl and paths are relative to the file that defines them

When creating a shared `tsconfig.nextjs.json` at the repo root, do NOT put `baseUrl` or `paths` in it. These resolve relative to the file that defines them, so `"baseUrl": "."` in a root tsconfig means the repo root — not the app directory. Each app must define its own `baseUrl`, `paths`, and `include` in its local `tsconfig.json`.
