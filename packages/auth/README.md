# auth

Auth library: config, proxy helpers, and session accessors.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `auth` | Server-side gateway access: `bifrost` (gateway fetch), `getSession`, `requireSession`, `requireAdmin`, the helpers of the pending second sign-in step (`getSecondStep`, `requireSecondStep`, `forwardToSecondStep`), and the `Session`, `User`, and `SecondFactorMethod` types. |
| `auth/config` | `withAuth`, which wraps a Next config with the gateway rewrites. |
| `auth/proxy` | `proxy`, the session gate that the `proxy.ts` of an app exports, and `forwardClientIp`, the proxy of an app with no gate. Both send the browser address to the gateway. |

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
