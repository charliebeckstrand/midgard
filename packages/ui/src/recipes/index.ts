/**
 * Recipes — the design-system layer of the UI package.
 *
 *   kiso/   — substrate. Design-token primitives (iro / ji / ma / narabi /
 *             omote / hannou / sen / shaku / tsunagi / ugoki / kokkaku).
 *             Re-exported below.
 *   kata/   — per-component recipes (1:1 with `src/components/<name>/`).
 *             Internal; not re-exported. Components import directly:
 *             `from '../../recipes/kata/<name>'`.
 *   genkei/ — multi-element archetypes shared by ≥2 kata (panel, control,
 *             option, popover, kasane). Same internal status as kata.
 *
 * The recipe engine (`defineRecipe`, `palette`, `merge`) plus the colour
 * axis (`colors`, `Color`) and the `mode` / `shades` authoring helpers
 * live in `core/recipe/` and are re-exported below so consumers get the
 * full DSL from one barrel.
 *
 * `package.json` `exports` omits `./recipes` and `./recipes/*` — kata and
 * genkei are unreachable from outside the package. The contract is pinned
 * by `src/__tests__/recipes/boundary/recipe-boundary.test.ts`.
 */

export * from '../core/recipe'
export * from './kiso'
