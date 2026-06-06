# CONVENTIONS.md

> Toolchain defaults: [Turborepo](https://turborepo.dev/docs), [Next.js](https://nextjs.org/docs/app), [Biome](https://biomejs.dev), [TypeScript](https://www.typescriptlang.org/tsconfig), [Vitest](https://vitest.dev).

## 1. Workspace

1.1 Turborepo, using the [recommended layout](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository).

1.2 Reach another workspace only through its public entry, never across package boundaries (§9).

## 2. Routing

2.1 App Router **only**.

2.2 For [Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), keep `'use client'` on the interactive leaf; never promote it onto a layout or page that could stay server-rendered.

2.3 When a server page hands data to an interactive subtree, split `page.tsx` (server) + `client.tsx` (client).

2.4 [`params` / `searchParams` are async](https://nextjs.org/docs/app/api-reference/file-conventions/page) — prefer the generated `PageProps` helper for typing.

## 3. Components

See [REFERENCE.md](REFERENCE.md).

3.1 Compose from the design system (`ui`).

3.2 App-local components (`apps/<app>/src/components/<name>/`) hold feature logic (e.g. `<feature>-picker`, `<feature>-combobox`). Reusable presentation belongs in `ui`.

3.3 One directory per unit: `<name>.tsx`, `<name>-<part>.tsx` (sub-components), `use-<name>-<hook>.ts` (hooks), `context.ts`, `types.ts`, `index.ts` (barrel, re-exports only).

3.4 Named exports only. Each file's PascalCase / `useCamelCase` export matches its filename.

3.5 The barrel is the public surface. External consumers (apps, other packages) import the directory, never its internal files (§9).

Within `ui`, a sibling component may reach past the barrel for a foundation's leaf module: its `context.ts`, a `use-*` hook, or a `*-utilities` or `variants` helper. That's how shared cascades like `useControl` and `useGlass` travel without pulling in the component's full surface. What a sibling must never import is another component's main `<name>.tsx`. All of this is enforced by `component-boundary.test.ts`.

3.6 Skeleton state is ambient. A skeleton-aware component reads `useSkeleton()` and, when true, returns a dedicated skeleton — never an inline `<Placeholder>` in the component body. Size- or base-keyed leaves build it with `createSkeleton(k.skeleton, '<Name>Skeleton')` and export it from the barrel (`button`, `badge`, `checkbox`, `radio`, `switch`, `text`). Leaves whose silhouette keys off another axis (`heading` by level) or folds in extra context (`avatar`'s density scope, `control`'s join) hand-write the skeleton but still export it. Composition containers don't short-circuit: they render their frame and let each child skeletonize itself (`card`); only internal sub-parts that aren't independently addressable may keep a recipe-driven inline short-circuit (`stat`). Silhouette dimensions live in the `kokkaku` skeleton-form layer (`recipes/kiso/kokkaku/<name>.ts`), wired into the kata as `skeleton:`. Wrappers and composites inherit coverage from the leaves they delegate to (`select` via `listbox`, the specialized inputs via `input`), so they add no skeleton of their own. Inline display leaves (`icon`, `kbd`, `code`, `status`, `time-ago`, `odometer`, `link`) and data-heavy compositions (`data-table`, `table`) deliberately have none for now.

## 4. TypeScript

4.1 In place of `any`, use `unknown` with narrowing, generics, or a precise type. Type external responses at the fetch boundary.

4.2 Prefer `type` aliases for props and data shapes; co-locate small ones, extract to `types.ts` once shared or large.

4.3 Module constants: `UPPER_SNAKE_CASE` for magic values, `camelCase` for keyed lookup/config objects.

## 5. Styling

5.1 Tailwind v4 utilities, composed with `cn()` via `ui/core` (clsx + tailwind-merge).

5.2 Visual variants come from a component's recipe, consumed through its props.

5.3 Spacing, sizing, and color use the named scale and palette tokens, not magic pixel or hex values.

## 6. State & data

6.1 No global state library. Cross-cutting state is React Context at `apps/<app>/app/providers.tsx`.

6.2 Server data is fetched in Server Components or `'use server'`. They attach the bearer token and resolve the gateway origin server-side.

6.3 Client fetches hit the same-origin proxy at `api/[...path]`. They never call the gateway or handle tokens directly.

6.4 Shared client fetches use the data-hook pattern: a module-scoped cache and a deduped in-flight promise, exposed as `use<Thing>()` → `{ data, loading, error }`, keyed by a serialized input; `setState` is guarded by an `active` flag.

## 7. Forms

7.1 Forms compose `ui/form`, which owns form state via `useSyncExternalStore` and accepts optional schema resolvers for validation.

## 8. Naming

8.1 kebab-case files/directories; PascalCase components; `useCamelCase` hooks (`use-*.ts`); PascalCase types with a contextual suffix (`<Component>Props`, `<Thing>Option`, `<Feature>State`).

8.2 Feature folders mirror their route segment. Co-located helpers carry intent-revealing suffixes: `<feature>-api.ts`, `types.ts`, `constants.ts`, `utilities.ts`.

## 9. Imports

9.1 In apps, use the `@/*` alias (`@/components/…`, `@/api/…`); never deep relative chains. 

From packages/ui, import per-component entries (`ui/button`, `ui/dialog`) plus `ui/core`, `ui/hooks`, `ui/primitives/*`, `ui/providers/*`, `ui/types`. No root barrel.

9.2 Import order is handled by [Biome's organize-imports](https://biomejs.dev/assist/actions/organize-imports/).

## 10. Testing

10.1 Test locations:

| Scope | Location |
|---|---|
| App | `apps/<app>/src/__tests__/**/*.test.{ts,tsx}` |
| Component | `packages/ui/src/__tests__/` |

10.2 Component tests render through the library's test renderer and query by `data-slot`. New components expose stable `data-slot` anchors and a filename-matched export.

10.3 **Don't drive third-party async lifecycles** (fetch, virtualization, floating-ui, pdfjs) in tests — they flake on CI. Test the synchronous seam (a reducer, a callback, a typed harness) or skip with a stated reason.

10.4 While editing, run a scoped subset (`test:changed`, `test:related`). Prove changes pass before claiming done ([CLAUDE.md](CLAUDE.md) §3.4).

## 11. Environment

11.1 [`NEXT_PUBLIC_*`](https://nextjs.org/docs/pages/guides/environment-variables) is client, else server-only. Confine raw `process.env` reads to the config edge (`apps/<app>/src/api/config.ts`), not scattered through features.

11.2 New variables get an `.env.example` entry and a typed declaration in the env config.

---

**See also:** [CLAUDE.md](CLAUDE.md), [REFERENCE.md](REFERENCE.md).
