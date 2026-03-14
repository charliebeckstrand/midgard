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
