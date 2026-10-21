/**
 * Recipes: the design-system layer of the UI package.
 *
 *   kiso/ - the design tokens. Each family has a Japanese name (dan / iro /
 *           ji / ma / narabi / omote / hannou / sen / shaku / sou / tsunagi /
 *           ugoki / kokkaku / kasane / kara / zu), and each key under it has
 *           an English name. Read by kumi and kata.
 *   kumi/ - the groups. The shared structure of a family of units, in the
 *           shape of a unit (`defineGroup`). A kata unit extends its group.
 *           Read only by kata.
 *   kata/ - per-component recipes (1:1 with `src/components/<name>/`). Reads
 *           kumi and kiso. Consumed by components and primitives.
 *
 * Components, modules, and primitives reach the recipe layer through their
 * owning kata (`from '../../recipes/kata/<name>'`). Cross-layer value imports
 * are pinned by `noRestrictedImports` in `biome.json` and the
 * `no-value-import-from-recipes-barrel` Biome plugin.
 *
 * This barrel is types-only. It re-exports the recipe-substrate types
 * (`Color`, `Ma`, `GroupOrientation`); consumers
 * derive prop unions from them without threading types through their kata.
 * No runtime values pass through; values reach consumers through their kata
 * funnel. The types-only shape is pinned by
 * `__tests__/boundary/recipe-boundary.test.ts`.
 */

export type { Color } from '../core/recipe'
export type { Ma } from './kiso/ma'
export type { GroupOrientation } from './kiso/tsunagi'
