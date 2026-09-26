# auth

Auth library: config, proxy helpers, and user accessor.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `auth` | Server-side gateway access: `bifrost` (gateway fetch), `getUser`, and the `Session`, `User`, and `UserRole` types. |
| `auth/config` | `withAuth`, which wraps a Next config with the gateway rewrites. |
| `auth/proxy` | `proxy`, the session gate that the `proxy.ts` of an app exports. |

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm --filter auth build` |
| Watch build | `pnpm --filter auth dev` |
| Test | `pnpm --filter auth test` |
| Lint | `pnpm --filter auth lint` |
| Format | `pnpm --filter auth format` |

## 3. Consumers

[`apps/admin`](../../apps/admin/README.md) and [`apps/places`](../../apps/places/README.md) use this package.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
