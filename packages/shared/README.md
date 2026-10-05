# shared

Cross-app auth UI and the global stylesheet.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

The apps compile this package from its source, as they do `ui`, so it has no build step.

| Path | Purpose |
|---|---|
| `shared/auth` | Auth UI: `LoginPage`, `RegisterPage`, `VerifyPage` (the second step after a sign-in), and `SecondStepDialog` with `ensureSecondStep` (the second step when a request needs it). `bifrost` is the typed client of the gateway in the browser, and `unwrap` throws for a status that is not OK. `signOut`, `sendVerificationEmail`, `oauthStartPath`, and `signInProviderNames` are the account helpers of the apps. The requests go to the same-origin `/auth/*` and `/api/*` paths, which `withAuth` rewrites to the gateway. |
| `shared/providers` | `AppProviders`: `UIProvider` with the `Link` of Next, `AppearanceProvider`, and one `QueryClient`. The app gives its query defaults. |
| `shared/globals.css` | Global stylesheet: `ui/tailwind.css`, which gives the font and `--font-sans`, the root styles, and a `dark` variant that follows the `.dark` class. `AppearanceProvider` from `ui/providers/appearance` sets that class. The root layout renders `FontScript` from the same entry. |

`shared/globals.css` names `shared` and `ui` as Tailwind sources, so an app that imports it gets the classes of both. The app names only its own sources.

## 2. Commands

| Goal | Command |
|---|---|
| Test | `pnpm --filter shared test` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 3. Consumers

[`apps/admin`](../../apps/admin/README.md) and [`apps/places`](../../apps/places/README.md) use the auth UI, the providers, and the stylesheet. This package depends on [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
