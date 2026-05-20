/**
 * Recipes — the design-system layer of the UI package.
 *
 *   kiso/   — substrate. Design-token primitives (iro / ji / ma / narabi /
 *             omote / hannou / sen / shaku / tsunagi / ugoki / kokkaku) plus
 *             the mode/shades helpers. Re-exported below.
 *   kata/   — per-component recipes (1:1 with `src/components/<name>/`).
 *             Internal to the package; not re-exported from this barrel.
 *             Components consume kata via a relative path:
 *             `from '../../recipes/kata/<name>'`.
 *   genkei/ — multi-element archetypes shared by ≥2 kata (panel, control,
 *             option, popover, kasane). Same internal status as kata.
 *
 * The recipe engine (`defineRecipe`, `palette`, `merge`) lives in
 * `core/recipe/` and is re-exported below so consumers get the full DSL
 * surface from this single barrel.
 *
 * `package.json` `exports` deliberately omits `./recipes` and `./recipes/*`,
 * so kata and genkei are unreachable from outside the package. The contract
 * is pinned by `src/__tests__/recipes/boundary/recipe-boundary.test.ts`.
 */

export * from '../core/recipe'
export * from './kiso'
