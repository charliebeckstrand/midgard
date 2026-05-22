/**
 * Recipes — the design-system layer of the UI package.
 *
 *   kiso/   — substrate. Design-token primitives (iro / ji / ma / narabi /
 *             omote / hannou / sen / shaku / sun / tsunagi / ugoki /
 *             kokkaku). Consumed by kata and genkei only.
 *   genkei/ — multi-element archetypes shared by ≥2 kata. Consumed by kata.
 *   kata/   — per-component recipes (1:1 with `src/components/<name>/`).
 *             Consumed by components and primitives.
 *
 * Components and primitives reach the recipe layer through their owning
 * kata (`from '../../recipes/kata/<name>'`). Cross-layer value imports are
 * pinned by `__tests__/components/boundary/component-recipe-boundary.test.ts`
 * and `__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.
 *
 * This barrel is types-only. It re-exports the recipe-substrate types
 * (`Color`, `Ji`, `Ma`, `Step`, `SunStep`, `GroupOrientation`,
 * `GroupPosition`) so consumers can derive prop unions without threading the
 * type through their kata. No runtime values pass through; values reach
 * consumers through their kata funnel. The types-only shape is pinned by
 * `__tests__/recipes/boundary/recipe-boundary.test.ts`.
 */

export type { Color } from '../core/recipe'
export type { Ji } from './kiso/ji'
export type { Ma } from './kiso/ma'
export type { Step, SunStep } from './kiso/sun'
export type { GroupOrientation, GroupPosition } from './kiso/tsunagi'
