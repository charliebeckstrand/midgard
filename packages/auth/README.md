# auth

Auth library: config, proxy helpers, and session accessors.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `auth` | Server-side gateway access: `bifrost` (the typed client of the gateway, which forwards the session cookies), `createGatewayClient` (the same client for the spec of a service that the gateway forwards to), `getSession` (it throws a `GatewayError` when the gateway fails), `requireGateway` (a read that throws a `GatewayError` on a failure), `requireSession`, `requireAdmin` (an admin session that passed the second step), `getSignInProviders` (the GitHub and Google sign-in the gateway has set up, and a `"use cache"` read that sends no cookies), and the `Session`, `User`, `Role`, and `SignInProvider` types. `Paths` and `Schema` give the types of the gateway API, from `src/openapi.d.ts`. |
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
| Generate the gateway types | `pnpm --filter auth openapi` |

## 3. Consumers

[`apps/admin`](../../apps/admin/README.md), [`apps/places`](../../apps/places/README.md), and [`shared`](../shared/README.md) use this package. `shared` takes only its types.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
