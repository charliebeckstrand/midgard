# CONVENTIONS.md

How code is written in this repo. Rules are citable (e.g. “CONVENTIONS 3.4”). Conduct, voice, and version control live in <CLAUDE.md>; the component library and data surfaces are mapped in <REFERENCE.md>.

## 1. Workspace

1.1 pnpm workspace + Turbo monorepo. Apps live in `apps/*`; shared packages live in `packages/*`. The design-system package is `ui` (§3, §9).

1.2 Run tasks through Turbo from the root (`turbo run build`, `turbo run check-types`) or from within a package. Never hand-edit `dist/` or `.next/`.

1.3 Reach another workspace only through its public entry (§9), never across package boundaries by path.

## 2. Routing

2.1 App Router only. Route groups partition concerns: `(app)` for the authenticated product surface, `(auth)` for sign-in. Co-locate route-specific UI, hooks, and data with the segment that owns them.

2.2 Server Components are the default. Add `'use client'` on the leaf that needs interactivity, state, or browser APIs, and push it down the tree — never onto a layout or page that could stay server-rendered.

2.3 When a page fetches on the server and hands data to an interactive subtree, split it `page.tsx` (server) + `client.tsx` (client); a server layout splits the same way into `layout.tsx` + `layout-client.tsx`.

2.4 `params` and `searchParams` are async — await them.

## 3. Components

3.1 Compose from `ui` before inventing. `ui` carries the component, design-token, and recipe system; hand-rolling raw Tailwind for anything the library already covers is a defect. When a needed component is missing but would be reusable, recommend it for the library rather than burying it in a feature. See <REFERENCE.md>.

3.2 App-local components live in `apps/<app>/src/components/<name>/` and hold feature/domain logic that composes library primitives (e.g. a `<feature>-picker` or `<feature>-combobox`). Domain-agnostic, reusable presentation belongs in `ui`, not the app.

3.3 One directory per unit: `<name>.tsx` (main), `<name>-<part>.tsx` (sub-components, always prefixed), `use-<name>-<hook>.ts` (hooks), `context.ts`, `types.ts`, `index.ts` (barrel — re-exports only). Filenames must stay legible stripped of folder context.

3.4 Named exports only; no default exports. Every file exports a symbol whose PascalCase / `useCamelCase` form matches its filename.

3.5 The barrel is the public surface and nothing more; consumers import the directory, never its internal files (§9).

## 4. TypeScript

4.1 `strict` is on, plus `noUncheckedIndexedAccess`. Indexed access is `T | undefined` — handle it; don’t assert it away.

4.2 No `any`. Use `unknown` with narrowing, generics, or a precise type. Type external responses at the fetch boundary.

4.3 Prefer `type` aliases for props and data shapes, matching the prevailing style. Co-locate small types with their component; extract to `types.ts` when they grow or are shared.

4.4 Module constants: `UPPER_SNAKE_CASE` for fixed magic values, `camelCase` for keyed lookup/config objects — UPPER if you’d inline it as a literal, camel if you’d index into it.

## 5. Styling

5.1 Tailwind v4 utilities, composed with `cn()` from `ui/core` (clsx + tailwind-merge, extended with the named spacing scale `xs/sm/md/lg/xl`). Never concatenate class strings by hand.

5.2 Visual variants come from a component’s recipe, consumed through its props. Don’t re-derive a component’s look with raw utilities, and don’t author Tailwind variants in the app.

5.3 Spacing, sizing, and color use the named scale and palette tokens, not magic pixel or hex values.

## 6. State & data

6.1 No global state library (no Redux, Zustand, or React Query). Cross-cutting state is React Context, provided at `apps/<app>/app/providers.tsx`; local state stays local.

6.2 Server data is fetched in Server Components or `'use server'` modules under `apps/<app>/src/api/*`. These attach the bearer token and resolve the gateway origin server-side; secrets never reach the client.

6.3 Client-side fetches hit the same-origin proxy at `/api/*` (the `app/api/[...path]` route handler forwards to the gateway with auth attached). Client code never calls the gateway or handles tokens directly.

6.4 Shared client fetches follow the sanctioned data-hook pattern: a module-scoped cache plus a deduped in-flight promise, exposed as `use<Thing>()` returning `{ data, loading, error }`. Re-run on a serialized key and guard async `setState` with an `active` flag.

## 7. Forms

7.1 Forms use controlled React state with native validation today; submission goes through server actions. No form or schema library is in use.

7.2 Adopting react-hook-form, zod, or similar is an architectural decision — surface it for assent (CLAUDE.md 3.1) before adding the dependency; don’t smuggle one in for a single form.

## 8. Naming

8.1 Files and directories are kebab-case. Components are PascalCase. Hooks are `useCamelCase` in `use-*.ts` files. Types are PascalCase with a contextual suffix (`<Component>Props`, `<Thing>Option`, `<Feature>State`).

8.2 Feature folders mirror their route segment. Co-located helpers carry intent-revealing suffixes: `*-api.ts`, `types.ts`, `constants.ts`, `utilities.ts`.

## 9. Imports

9.1 In-app, use the `@/*` alias (`@/components/…`, `@/api/…`) — never deep relative chains. From the library, import per-component entries (`ui/button`, `ui/dialog`) plus `ui/core`, `/hooks`, `/primitives/*`, `/providers/*`, `/types`. There is no root barrel.

9.2 Biome organizes import order — don’t hand-sort.

## 10. Formatting & lint

10.1 Biome owns formatting and linting; there is no ESLint or Prettier. Tabs, 100-column width, single quotes, semicolons as-needed, imports auto-organized. Run `biome check`; don’t override formatting by hand.

10.2 Biome’s recommended rule set is the baseline. Fix lint at the source; an ignore comment must state why.

## 11. Testing

11.1 Vitest is the only runner. App tests live in `apps/<app>/src/__tests__/**/*.test.{ts,tsx}` (jsdom, UTC); library tests in `packages/ui/src/__tests__/`, mirroring source.

11.2 Library component tests render through the library’s test renderer and query by `data-slot`. New `ui` components expose stable `data-slot` hooks and a filename-matched export — a boundary test enforces the latter.

11.3 Don’t drive third-party async lifecycles (fetch, virtualization, floating-ui, pdfjs) in tests; they flake on CI. Test the synchronous seam — a reducer, a callback, a typed harness — or skip with a stated reason.

11.4 Inside the editing loop, run a scoped subset (`test:changed`, `test:related`); let the pre-commit hook run the full gate. Prove changes pass before claiming done (CLAUDE.md 3.4).

## 12. Environment

12.1 Client-exposed config is prefixed `NEXT_PUBLIC_*`; everything unprefixed is server-only. Keep raw `process.env` reads at the config edge (e.g. `apps/<app>/src/api/config.ts`), not sprinkled through features.

12.2 A new variable gets an entry in `.env.example` and a typed declaration in the env config. Secrets never take a `NEXT_PUBLIC_` prefix and never land in git (CLAUDE.md 4.4).
