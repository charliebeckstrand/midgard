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
