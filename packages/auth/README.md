# auth

Auth library: config, proxy helpers, and user accessor.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `auth` | Package barrel — `bifrost` (gateway fetch) and `getUser`. |
| `auth/config` | `withAuth` — wraps a Next config with the gateway rewrites. |
| `auth/proxy` | Gateway proxy handler for same-origin API routes. |
| `auth/user` | Current-user accessor for Server Components and route handlers. |

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm --filter auth build` |
| Watch build | `pnpm --filter auth dev` |
| Test | `pnpm --filter auth test` |
| Lint | `pnpm --filter auth lint` |
| Format | `pnpm --filter auth format` |

## 3. Consumers

Used by [`apps/admin`](../../apps/admin/README.md) and re-exported in part by [`packages/shared`](../shared/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
