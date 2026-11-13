# shared

Cross-app auth UI, the error and 404 pages, the types of the Mimir API, the global stylesheet, and the server of the app images.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

The apps compile this package from its source, as they do `ui`. The one build step is the server of the app images (§2).

| Path | Purpose |
|---|---|
| `shared/auth` | Auth UI: `LoginPage` (with `secondStep`, it also asks for the second step after a sign-in), `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, the user menu items `VerifyEmailMenuItem` and `SignOutMenuItem`, and `SecondStepDialog` with `ensureSecondStep` (the second step when a request needs it). `bifrost` is the typed client of the gateway in the browser, and `unwrap` throws a `RequestError` with the status for a status that is not OK. The Mimir clients resolve through `unwrap` too. `sendVerificationEmail`, `oauthStartPath`, and `signInProviderNames` are the account helpers of the apps. The requests go to the same-origin `/auth/*` and `/api/*` paths, which `withAuth` rewrites to the gateway. |
| `shared/providers` | `AppProviders`: `AppearanceProvider`, `UIProvider` with the `Link` of Next, `LocaleProvider`, and one `QueryClient`. The apps render in `en`, and the settings have no Language picker. The provider gives the catalogs of shared to the messages, over the catalogs of ui. The app gives its query defaults, and its `timeZone` and `dateFormat`. The root layout of the app renders it in `<body>`, and `<html>` has `suppressHydrationWarning`, because the server of the app writes the stored settings on it. A query or a mutation that fails with a `401` goes to `/login`. Any other failed mutation shows its error in a toast, unless its `meta` sets `inlineError` because the page shows the error in place. `latestError` gives the error of the mutation that started last, for a card that runs several mutations. |
| `shared/mimir` | The `paths` and `components` types of the Mimir API, in asgard, from `src/mimir/openapi.d.ts`. The places and the picks apps type their Mimir clients from it. `createMimirClient` makes the client in the browser, and `unwrap` from `shared/auth` reads its result. |
| `shared/queries` | `seed` marks the read of a server page with the time of the read, and `seededQuery` puts that read into a client query. The query keeps the entry only while its page is open, so a revisit shows the newer read of the server and does not fetch again. |
| `shared/refresh` | The refresh of a page, in place. `useRefresh` renders the page again on the server when the reader asks, and shows an error toast when the server gives no answer. `LiveRefresh` renders it again each minute while its `live` prop holds and the tab is visible. Each refresh starts only when `/api/build` gives the build of the page, because Next reloads the whole page otherwise. `useBuildWatch` reads the build each minute, and `useNewBuild` gives `true` after a deploy. The elections app refreshes only on a press of its footer button, and the picks app renders `LiveRefresh` on a week in play. |
| `shared/refresh/build` | The `GET` handler of `/api/build`, which gives the build of the server. Each app that renders `LiveRefresh` serves it. |
| `shared/events` | `onRouterTransitionStart`, which records the start of each navigation of the App Router as a route event while the events of `ui/events` run. Each app re-exports it from its `instrumentation-client.ts`. |
| `shared/pages` | `ErrorPage` and `NotFoundPage`, which the `app/error.tsx` and `app/not-found.tsx` of each app re-export as their default exports, and `notFoundMetadata`, which `app/not-found.tsx` re-exports as its `metadata`. |
| `shared/globals.css` | Global stylesheet: `ui/tailwind.css`, which gives the font (except its latin face) and `--font-sans`, the root styles, and a `dark` variant that follows the `.dark` class, else the OS while the root has no `.light` class. `AppearanceProvider` from `ui/providers/appearance` sets the classes, and it adds the latin face. |

`shared/globals.css` names `shared` and `ui` as Tailwind sources, so an app that imports it gets the classes of both. The app names only its own sources.

## 2. The server of the app images

`src/server/serve-next.ts` runs a Next app in its image, in place of the `server.js` of the standalone output. It writes the stored settings of the reader on `<html>` of each HTML page (`markHtml`), from the cookies of the request, so the first paint shows the theme, the density, the motion, the sidebar, and the events with no script (CONVENTIONS §3.13). An HTML page is then private to the reader: `Cache-Control: private, no-cache`, `Vary: Cookie`, and no `ETag`. The server compresses each response with gzip, after the marks. `pnpm --filter shared build` writes the bundle to `dist/serve-next.js`, and the `Dockerfile` runs it beside the `server.js` of the app. `next dev` has no such layer, so there the settings apply at hydration.

## 3. Commands

| Goal | Command |
|---|---|
| Test | `pnpm --filter shared test` |
| Build the server of the app images | `pnpm --filter shared build` |
| Generate the Mimir types | `pnpm --filter shared openapi` |
| Write the English message catalog, `src/locale/lang/en.json` | `pnpm --filter shared intl` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 4. Consumers

Each app uses the providers, the stylesheet, the error and 404 pages, and the navigation hook of `shared/events`. Admin, places, and picks also use the auth UI. [`apps/places`](../../apps/places/README.md) and [`apps/picks`](../../apps/picks/README.md) use the Mimir types. This package depends on [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
