# Architecture Decisions

Non-trivial design choices with context, alternatives, and trade-offs.

## 2026-03-14 — Rename claude/ to docs/ and create docs dashboard app

**Status:** Accepted

**Context:** The `claude/` directory served as an agent-only knowledge base. The user wanted it to also function as browsable project documentation for humans, and a new app to render the markdown files.

**Decision:** Renamed `claude/` to `docs/` and created `apps/docs` — a Next.js app that reads markdown from the root `docs/` directory and renders it as a dashboard. The docs are public by default; files marked with `<!-- auth: required -->` are hidden from unauthenticated users. Only a curated subset of docs are published in the app (via `PUBLISHED_DOCS` in `app/lib/docs.ts`); agent-specific files like `lessons.md`, `preferences.md`, `context.md`, and `debt.md` remain for agent use but aren't surfaced in the UI. CLAUDE.md was updated to be app-agnostic so it can be reused across repos.

**Alternatives:**
- MDX with file-based routing: more complex, requires compilation step, not needed for read-only docs.
- Third-party docs framework (Docusaurus, Nextra): adds heavy dependency for simple markdown rendering.
- Keep `claude/` name: confusing for non-agent users browsing the repo.

**Consequences:**
- The `docs/` directory name is generic and expected by developers.
- Agent and human docs share the same source of truth.
- The `PUBLISHED_DOCS` allowlist must be updated when new user-relevant docs are added.

## 2026-03-14 — react-markdown + remark-gfm for markdown rendering

**Status:** Accepted

**Context:** Need to render markdown from local docs files in a Next.js server component with syntax highlighting.

**Decision:** Use `react-markdown` v10 (`MarkdownAsync` export for RSC compatibility) with `remark-gfm` for GFM support and Shiki for syntax highlighting via a custom `code` component.

**Alternatives:**
- Custom markdown-to-HTML renderer: fewer deps but fragile and requires maintaining parsing logic for every markdown feature.
- MDX compilation: overkill for read-only rendering of plain markdown files.

**Consequences:**
- Battle-tested markdown parsing with full GFM support (tables, strikethrough, task lists, etc.).
- `MarkdownAsync` export works in React Server Components without `'use client'`.
- Shiki provides high-quality syntax highlighting with VS Code themes.

## 2026-03-14 — Extract UI resources from Heimdall into Sindri package

**Status:** Accepted

**Context:** Heimdall is an auth proxy (session management, route protection, Next.js config helpers), but it also contained UI components (LoginPage, RegisterPage, PasswordInput) and a form hook (useForm). These are shared UI resources that don't belong in an auth module.

**Decision:** Created `packages/sindri` (named after the master dwarf craftsman of Norse mythology) to hold shared UI resources. Moved all components and hooks from Heimdall to Sindri. Heimdall is now purely server-side with no UI dependencies. Apps import auth pages from `sindri/login-page` and `sindri/register-page` instead of `heimdall/login-page` and `heimdall/register-page`.

**Alternatives:**
- Keep everything in Heimdall: simpler but conflates auth proxy concerns with UI.
- Move into Catalyst: Catalyst is a generic component library (Headless UI + Tailwind), while these are auth-specific page components with business logic.

**Consequences:**
- Heimdall has zero UI dependencies (no catalyst, reactbits, @heroicons/react).
- Sindri can grow to hold more shared UI resources (e.g., profile pages, settings forms).
- Apps that need auth pages must depend on both heimdall (for session/proxy) and sindri (for UI).
- Tailwind `@source` directives updated: admin points to sindri instead of heimdall; docs adds sindri.

## 2026-03-14 — Rename apps/mimir to apps/admin

**Status:** Accepted

**Context:** The app name "Mimir" (Norse mythology) was not descriptive of its purpose. The app is the primary admin dashboard.

**Decision:** Renamed `apps/mimir` to `apps/admin`. Updated package name, metadata title, and all documentation references.

**Alternatives:**
- Keep Norse naming: consistent with other packages but unclear to new developers.
- Use "dashboard": too generic, "admin" better describes the app's role.

**Consequences:**
- The app directory, package name, and page title are now `admin`/`Admin`.
- Norse naming is preserved for infrastructure packages (heimdall, sindri, bifrost) where the metaphors are more descriptive.
- Existing Turbo cache is invalidated (package name changed).

## 2026-03-15 — Remove HeadlessUI from catalyst, replace with motion + primitives

**Status:** Accepted

**Context:** HeadlessUI components in the catalyst package caused intermittent hydration errors across all apps. The library's approach of rendering elements with data attributes during SSR didn't always match the client-side hydration output.

**Decision:** Removed `@headlessui/react` entirely from catalyst. Replaced with:
1. `primitives.tsx` — `InteractiveButton`, `InteractiveLink`, `useInteractiveHandlers()` that manage `data-hover`/`data-active`/`data-focus`/`data-disabled` attributes via DOM event handlers, preserving all existing Tailwind class strings.
2. `motion/react` — `AnimatePresence` + `motion.div` for animated overlays (sidebar drawer, dropdown menu, dialog, alert).
3. Native ARIA — `role="dialog"`, `role="menu"`, `role="menuitem"`, `role="listbox"`, `role="option"`, `role="combobox"`, `role="switch"`, `role="checkbox"`, `role="radio"` with proper `aria-*` attributes.
4. `inert` attribute on main content for focus trapping in modals.
5. `useEffect`-based Escape key and click-outside handlers.

**Alternatives:**
- Fix HeadlessUI hydration issues: Attempted but the errors were intermittent and hard to reproduce/debug. The library's internal state management during SSR was the root cause.
- Use Radix UI: Another headless library but would introduce a new dependency with potentially similar SSR issues.

**Consequences:**
- No more intermittent hydration errors from HeadlessUI.
- One fewer dependency (bundle size reduction).
- Custom implementations are simpler but less battle-tested for edge cases (e.g., complex focus trapping, virtual scrolling in combobox).
- All existing Tailwind class strings preserved — no consumer-facing API changes.

## 2026-03-15 — Chat app hook extraction and scroll-to-bottom fix

**Status:** Accepted

**Context:** The chat app had monolithic components (`chat-view.tsx`, `client.tsx`) with duplicated types across files and a scroll bug where `scrollToBottom()` was called synchronously after `setMessages()` before React had committed the state update to the DOM.

**Decision:** Extracted shared types to `types.ts`, created three hooks (`use-scroll-to-bottom`, `use-chat-messages`, `use-chat-actions`), and replaced manual textarea auto-resize with `react-textarea-autosize`. The scroll fix uses `useEffect` watching `messages.length` to scroll after the DOM update instead of calling synchronously after setState.

**Alternatives:**
- Keep monolithic components: simpler file structure but harder to test and reason about.
- Use `requestAnimationFrame` for scroll: works but `useEffect` is the idiomatic React approach.
- Custom auto-resize hook: possible but `react-textarea-autosize` handles edge cases (mobile font-size changes, IME input, font loading) that are hard to get right.

**Consequences:**
- Chat components are thin render shells, logic is testable in isolation.
- Scroll-to-bottom reliably fires after DOM updates.
- `react-textarea-autosize` adds ~1.5KB to the chat app bundle.

## 2026-03-15 — Docs app: single-page layout with anchor scroll tracking

**Status:** Accepted

**Context:** The docs app had separate pages for each document (`/project`, `/decisions`, etc.) using a `[slug]` dynamic route. Navigating between docs required full page loads, and the sidebar only tracked the current route.

**Decision:** Consolidated all docs onto a single page. Each doc section is rendered with an `id` anchor matching its slug. The sidebar uses `#slug` anchor links and an `IntersectionObserver` to track which section is currently in view, updating the active sidebar item as the user scrolls.

**Alternatives:**
- Keep separate pages with prefetching: simpler routing but no scroll tracking, more network requests.
- Virtual scrolling: unnecessary complexity for the current number of docs.

**Consequences:**
- All docs load on a single page (larger initial payload, but all content is immediately available).
- Sidebar highlights the section currently in view as the user scrolls.
- The `[slug]` dynamic route is removed — old `/slug` URLs will 404 (acceptable since this is an internal tool).
- Adding a new doc still only requires adding to `PUBLISHED_DOCS` in `docs.ts`.

## 2026-03-14 — Consolidate shared app config and reduce duplication

**Status:** Accepted

**Context:** The admin and docs apps had identical or near-identical config files (postcss, tsconfig, theme.css, next.config). Adding a new app required copying boilerplate. The docs app also had a custom proxy implementation that duplicated heimdall/proxy logic, and an unnecessary auth re-export file.

**Decision:** Consolidated shared configuration:
1. Moved `postcss.config.mjs` to repo root (Next.js auto-discovers it up the directory tree)
2. Created `tsconfig.nextjs.json` at repo root with shared Next.js TypeScript settings; apps extend it and add only `baseUrl`, `paths`, and `include`
3. Moved `theme.css` to `sindri/theme.css` as a CSS export; apps import via `@import 'sindri/theme.css'`
4. Added `protect` option to `heimdall/proxy` (`true` by default); docs uses `protect: false` for public access
5. Removed `app/lib/auth.ts` re-export in docs; imports `getSession` directly from `heimdall`

**Alternatives:**
- Create a dedicated `app-config` package: adds a package for config that's only a few files.
- Shared root layout component in sindri: `next/font/google` has build-time compiler integration that may not work from external packages; body classes differ between apps.
- Keep everything as-is: each new app requires copying 5+ config files and risking drift.

**Consequences:**
- Adding a new app requires minimal boilerplate (see "Adding a New App" in project.md).
- Theme changes propagate to all apps automatically via sindri.
- Apps still own their `globals.css` (for app-specific Tailwind plugins like `@tailwindcss/typography`) and `layout.tsx` (for app-specific metadata).
- `baseUrl` and `paths` must remain in each app's tsconfig (they resolve relative to the file that defines them).

## 2026-03-15 — Add developer guides and grouped sidebar to docs app

**Status:** Accepted

**Context:** The docs app only showed agent-oriented reference docs (project map, decisions, error solutions, etc.). These are useful for agents but not immediately helpful for developers who need to know how to set up the project, run the dev server, or understand the architecture.

**Decision:** Add a "Guides" category of docs alongside the existing "Reference" category. Guide files (`getting-started.md`, `development.md`, `architecture.md`) are written for humans — onboarding, day-to-day workflow, and system design. The docs app sidebar groups these into two labeled sections. CLAUDE.md is updated to include guide files in Tier 1 reading, continuous learning, and the pre-push gate.

**Alternatives:**
- Separate docs site or README: adds another tool to maintain and fragments information.
- Inline everything in CLAUDE.md: makes the file too long and mixes agent instructions with developer docs.
- Keep only reference docs: leaves developers without onboarding material.

**Consequences:**
- New developers get a clear path from clone to running dev server.
- Agents read guide files on session start, gaining additional context.
- Guide files must be kept current — stale setup instructions are worse than none.
- The `GUIDE_DOCS` and `REFERENCE_DOCS` maps in `apps/docs/app/lib/docs.ts` control what appears in each sidebar section.

## 2026-03-15 — Separate agent response endpoint from message persistence

**Status:** Accepted

**Context:** The chat app coupled agent response generation with message persistence — a single POST to `/api/chat/{chatId}` both saved the user message and returned an agent reply from Bifrost. This made it impossible to swap the agent backend independently.

**Decision:** Created a dedicated `POST /api/chat/agent` Next.js API route handler. The client now: (1) saves the user message to Bifrost, (2) requests an agent response from the new endpoint, (3) saves the agent response to Bifrost. The agent endpoint currently returns a simulated response and accepts the full message history for context.

**Alternatives:**
- Keep the coupled approach: simpler but locks agent logic to Bifrost.
- Server action instead of API route: less flexible for future streaming or non-Next.js clients.

**Consequences:**
- Agent response logic is decoupled from persistence — can be swapped to a real LLM backend without changing Bifrost or the save flow.
- The Next.js API route takes precedence over the Bifrost rewrite for `/api/chat/agent`, while all other `/api/*` routes still proxy to Bifrost.
- Three sequential fetches per user message instead of two (save user → get agent → save agent).
