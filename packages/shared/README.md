# shared

Cross-app auth UI and the global stylesheet.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

The apps compile this package from its source, as they do `ui`, so it has no build step.

| Path | Purpose |
|---|---|
| `shared/auth` | Auth UI: `LoginPage`, `RegisterPage`. They post to the same-origin `/auth/*` paths, which `withAuth` rewrites to the gateway. |
| `shared/globals.css` | Global stylesheet: the Google Sans Flex font and the root styles. |

An app that renders `shared/auth` must add `packages/shared/src` as a Tailwind `@source`, so that Tailwind generates the classes of the auth UI.

## 2. Commands

| Goal | Command |
|---|---|
| Test | `pnpm --filter shared test` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 3. Consumers

[`apps/admin`](../../apps/admin/README.md) uses the auth UI and the stylesheet. [`apps/places`](../../apps/places/README.md) uses the stylesheet. This package depends on [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
