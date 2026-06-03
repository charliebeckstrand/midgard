# REFERENCE.md

> **Scope:** tool index for the repo. Repo-specific conventions live in [CONVENTIONS.md](CONVENTIONS.md).

## 1. Stack

| Layer | Tool |
|---|---|
| Library | [React](https://react.dev) |
| Framework | [Next.js](https://nextjs.org/docs/app) |
| CSS | [Tailwind CSS](https://tailwindcss.com/docs) |
| Design system | `packages/ui` |
| Testing | [Vitest](https://vitest.dev) |
| Build | [Turborepo](https://turborepo.dev/docs) |
| Formatter / linter | [Biome](https://biomejs.dev) |
| Pre-commit | [Lefthook](https://lefthook.dev) |
| Package manager | [pnpm](https://pnpm.io) |

## 2. Design system

The design system is the `ui` workspace. Components are imported per-name (`ui/button`, `ui/dialog`), backed by a layered recipe system pinned by boundary tests.

- Inventory of components, hooks, primitives, and providers — [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md).
- Recipe-system architecture — [`packages/ui/src/recipes/README.md`](packages/ui/src/recipes/README.md).

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md).
