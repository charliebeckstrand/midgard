# shared

Cross-app auth UI, the types of the Mimir API, and the global stylesheet.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

The apps compile this package from its source, as they do `ui`, so it has no build step.

| Path | Purpose |
|---|---|
| `shared/auth` | Auth UI: `LoginPage`, `RegisterPage`, `VerifyPage` (the second step after a sign-in), and `SecondStepDialog` with `ensureSecondStep` (the second step when a request needs it). `bifrost` is the typed client of the gateway in the browser, and `unwrap` throws for a status that is not OK. `signOut`, `sendVerificationEmail`, `oauthStartPath`, and `signInProviderNames` are the account helpers of the apps. The requests go to the same-origin `/auth/*` and `/api/*` paths, which `withAuth` rewrites to the gateway. |
| `shared/providers` | `AppProviders`: `UIProvider` with the `Link` of Next, `AppearanceProvider`, and one `QueryClient`. The app gives its query defaults. |
| `shared/mimir` | The `paths` and `components` types of the Mimir API, in asgard, from `src/mimir/openapi.d.ts`. The places and the picks apps type their Mimir clients from it. |
| `shared/globals.css` | Global stylesheet: `ui/tailwind.css`, which gives the font (except its latin face) and `--font-sans`, the root styles, and a `dark` variant that follows the `.dark` class. `AppearanceProvider` from `ui/providers/appearance` sets that class, and it adds the latin face. |

`shared/globals.css` names `shared` and `ui` as Tailwind sources, so an app that imports it gets the classes of both. The app names only its own sources.

## 2. Commands

| Goal | Command |
|---|---|
| Test | `pnpm --filter shared test` |
| Generate the Mimir types | `pnpm --filter shared openapi` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 3. Consumers

[`apps/admin`](../../apps/admin/README.md) and [`apps/places`](../../apps/places/README.md) use the auth UI, the providers, and the stylesheet. [`apps/places`](../../apps/places/README.md) and [`apps/picks`](../../apps/picks/README.md) use the Mimir types. This package depends on [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
