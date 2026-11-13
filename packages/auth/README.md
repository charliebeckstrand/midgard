# auth

Auth library: config, proxy helpers, and session accessors.

## 0. Prerequisites

Peer-compatible with Next 16.3 or later and React 19.2 or later.

## 1. Exports

| Path | Purpose |
|---|---|
| `auth` | Server-side gateway access. `bifrost` is the typed client of the gateway, which forwards the session cookies. `createGatewayClient` makes the same client for the spec of a service that the gateway forwards to. `getSession` throws a `GatewayError` when the gateway fails, and so does the read of `requireGateway`. `requireSession` gives the session, and `requireAdmin` gives an admin session that passed the second step. `getSignInProviders` gives the GitHub and Google sign-in that the gateway has set up, and `getTurnstileSiteKey` gives the Turnstile key of the register page. Both are `"use cache"` reads that send no cookies. The types are `Session`, `User`, `Role`, and `SignInProvider`, and `Paths` and `Schema` give the types of the gateway API, from `src/openapi.d.ts`. |
| `auth/app-config` | `appConfig`, the Next config that each app shares, and `securityHeaders`. It reads no environment, so an app with no sign-in uses it with no `BIFROST_URL`. |
| `auth/config` | `withAuth`, which wraps a Next config with the gateway rewrites, and `appConfig`, the Next config that each app shares. |
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

[`apps/admin`](../../apps/admin/README.md), [`apps/places`](../../apps/places/README.md), [`apps/picks`](../../apps/picks/README.md), [`apps/elections`](../../apps/elections/README.md), and [`shared`](../shared/README.md) use this package. `shared` takes only its types. `elections` takes only `auth/app-config`.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
