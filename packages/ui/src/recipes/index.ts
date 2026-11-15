/**
 * Recipes: the design-system layer of the UI package.
 *
 *   kiso/ - the design tokens. Each family has a Japanese name (dan / iro /
 *           ji / narabi / omote / hannou / sen / shaku / sou / tsunagi /
 *           ugoki / kokkaku / kasane / zu), and each key under it has
 *           an English name. Read by kumi and kata.
 *   kumi/ - the groups. The shared structure of a family of units, in the
 *           shape of a unit (`defineGroup`). A kata unit extends its group.
 *           Read only by kata.
 *   kata/ - the recipe of each unit: a component, a primitive, a structure
 *           unit, a module part, or a layout. Reads kumi and kiso.
 *
 * Components, modules, and primitives reach the recipe layer through their
 * owning kata (`from '../../recipes/kata/<name>'`). Cross-layer value imports
 * are pinned by `noRestrictedImports` in `biome.json`.
 *
 * This barrel holds types alone, so a value import from it does not compile.
 * It re-exports the recipe-substrate types (`Color` and `Ma`), so consumers
 * derive prop unions from them without threading types through their kata.
 * Values reach consumers through their kata funnel.
 * `__tests__/boundary/recipe-boundary.test.ts` pins the types-only shape.
 */

export type { Color } from '../core/recipe'
export type { Ma } from './kiso/dan'
