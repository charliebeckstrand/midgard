/**
 * Recipes: the design-system layer of the UI package.
 *
 *   kiso/     - the design tokens. Two tiers: primitive atomic concerns
 *               (iro / ji / ma / narabi / omote / hannou / sen / shaku /
 *               sun / tsunagi / ugoki / kokkaku / kasane) and semantic
 *               archetype bundles (control / popover / segment / panel /
 *               slider) composed from them. Read only by kata.
 *   katakana/ - the bridge. Pure functions that receive a kiso token
 *               bundle by argument and wire it into a recipe surface,
 *               importing only the recipe engine, never kiso values.
 *               Reached through the namespaced `bridge` object.
 *   kata/     - per-component recipes (1:1 with `src/components/<name>/`).
 *               The only layer that touches kiso; drives the bridge.
 *               Consumed by components and primitives.
 *
 * Components and primitives reach the recipe layer through their owning
 * kata (`from '../../recipes/kata/<name>'`). Cross-layer value imports are
 * pinned by `__tests__/boundary/component-recipe-boundary.test.ts`
 * and `__tests__/boundary/primitive-recipe-boundary.test.ts`.
 *
 * This barrel is types-only. It re-exports the recipe-substrate types
 * (`Color`, `Ma`, `Step`, `GroupOrientation`, `GroupPosition`); consumers
 * derive prop unions from them without threading types through their kata.
 * No runtime values pass through; values reach consumers through their kata
 * funnel. The types-only shape is pinned by
 * `__tests__/boundary/recipe-boundary.test.ts`.
 */

export type { Color, ExtendedColor, PaletteColor } from '../core/recipe'
export type { Ma } from './kiso/ma'
export type { Step } from './kiso/sun'
export type { GroupOrientation, GroupPosition } from './kiso/tsunagi'
