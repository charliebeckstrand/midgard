# midgard

## 1. Quick start

This repository pins pnpm 12 in the `packageManager` field. Install pnpm 12 on your machine before you start.

```sh
npm install --global pnpm@12
pnpm install
pnpm dev
```

An older global pnpm delegates to pnpm 12 through its tools cache. Turbo cannot start the launcher at that path, so the pre-push hook fails. A global pnpm 12 avoids the delegation and the failure.

`pnpm dev` launches [`hlidskjalf`](https://www.npmjs.com/package/hlidskjalf), a terminal UI for monitoring the Turborepo dev tasks.

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm build` |
| Dev | `pnpm dev` |
| Typecheck | `pnpm check-types` |
| Lint | `pnpm lint` |
| Lint and fix | `pnpm lint:fix` |
| Tests | `pnpm test` |

## 3. Workspaces

| Path | Role |
|---|---|
| [`apps/admin`](apps/admin/README.md) | Next.js admin app (App Router, Turbopack). |
| [`apps/places`](apps/places/README.md) | Next.js map of the places you have been (App Router, Turbopack). |
| [`packages/ui`](packages/ui/README.md) | Design system: components, primitives, hooks, providers, recipes. |
| [`packages/auth`](packages/auth/README.md) | Auth library: config, proxy, user. |
| [`packages/shared`](packages/shared/README.md) | Shared auth UI and the global stylesheet. |

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
