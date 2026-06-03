# midgard

A pnpm monorepo: a Next.js admin app (`apps/admin`) backed by a reusable design system (`packages/ui`) and shared auth/chat libraries (`packages/auth`, `packages/shared`). Repo-wide conventions live in [CONVENTIONS.md](CONVENTIONS.md); the tool index is [REFERENCE.md](REFERENCE.md); agent guidance is [CLAUDE.md](CLAUDE.md).

## 1. Quick start

```sh
pnpm install
pnpm dev
```

The dev orchestrator (`hlidskjalf`) wires up every workspace. The admin app serves on `http://localhost:3000`.

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm build` |
| Dev | `pnpm dev` |
| Typecheck | `pnpm check-types` |
| Lint | `pnpm lint` |
| Lint and fix | `pnpm lint:fix` |
| Tests | `pnpm test` |

Scoped tests run inside `packages/ui` (`pnpm --filter ui test:related`, `pnpm --filter ui test:changed`).

## 3. Workspaces

| Path | Role |
|---|---|
| [`apps/admin`](apps/admin/README.md) | Next.js admin app (App Router, Turbopack). |
| [`packages/ui`](packages/ui/README.md) | Design system: components, primitives, hooks, providers, recipes. |
| [`packages/auth`](packages/auth/README.md) | Auth library — config, proxy, user, plus the root export. |
| [`packages/shared`](packages/shared/README.md) | Shared auth/chat utilities and CSS themes. |

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
