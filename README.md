# midgard

## 1. Quick start

```sh
pnpm install
pnpm dev
```

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
| [`packages/ui`](packages/ui/README.md) | Design system: components, primitives, hooks, providers, recipes. |
| [`packages/auth`](packages/auth/README.md) | Auth library: config, proxy, user. |
| [`packages/shared`](packages/shared/README.md) | Shared auth/chat utilities and CSS themes. |

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
