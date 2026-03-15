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

## 2026-03-15 — Rendering the same React element twice with conditional mounting causes useId hydration mismatches

`SidebarLayout` renders `{sidebar}` twice — once for desktop (always visible) and once for mobile (inside `AnimatePresence` with `{open && ...}`). During SSR, both instances render and React assigns `useId()` values sequentially. On the client, the mobile copy is initially unmounted (`open` is `false`), so `useId()` produces different IDs, causing a hydration mismatch. Fix: always mount the mobile sidebar panel in the DOM and use `motion.animate` to show/hide it instead of conditional rendering. Only the backdrop should use `AnimatePresence` for mount/unmount.

## 2026-03-15 — motion.div onDrag type conflicts with React's onDrag

When spreading `React.ComponentPropsWithoutRef<'div'>` onto a `motion.div`, the `onDrag` types conflict — React's `DragEventHandler` is incompatible with motion's `(event: PointerEvent, info: PanInfo) => void`. Fix: don't spread arbitrary div props onto motion elements, or explicitly omit `onDrag` from the type.

## 2026-03-15 — Scroll-after-setState requires useEffect, not synchronous call

Calling `scrollToBottom()` immediately after `setMessages(newMessages)` doesn't work because React hasn't committed the update to the DOM yet. The new message element doesn't exist when scroll fires. Fix: use `useEffect` watching `messages.length` so scroll happens after React commits the DOM update.

## 2026-03-14 — tsconfig baseUrl and paths are relative to the file that defines them

When creating a shared `tsconfig.nextjs.json` at the repo root, do NOT put `baseUrl` or `paths` in it. These resolve relative to the file that defines them, so `"baseUrl": "."` in a root tsconfig means the repo root — not the app directory. Each app must define its own `baseUrl`, `paths`, and `include` in its local `tsconfig.json`.
