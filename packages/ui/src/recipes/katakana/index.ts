/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * **Mock — viability experiment, not the final shape.** The full proposal is
 * to dissolve `genkei/` and route every kata through this layer. Today four
 * entries are wired: a generic `recipe` (catch-all, thin re-export of
 * `defineRecipe`), `control` (text-input branch of the Control archetype),
 * `check` (check-input branch of the Control archetype, covering checkbox
 * and radio), and `popover` (floating-overlay archetype). The remaining
 * archetypes — `panel`, `segment` — will land here when the experiment
 * graduates.
 *
 * Shape of a katakana entry: a function that takes a kata's per-call
 * configuration (extra base, slots, defaults, axis overlays) and returns the
 * `k` surface ready for the kata to export. The applicator owns the
 * archetype's frame composition, fragment wiring, and sub-recipe attachment;
 * the kata stays a thin call site.
 *
 * `VariantPropsOf` is re-exported so kata that declare extra axes (e.g.
 * `textarea`'s `resize` / `autoResize`) can derive their full prop union
 * without reaching back to `core/recipe`. `defineColors` is re-exported
 * so kata can author their colour palettes from the same single import
 * surface they use for applicators.
 */

export { defineColors, type VariantPropsOf } from '../../core/recipe'
export { type CheckVariants, check } from './check'
export { type ControlVariants, control } from './control'
export { popover } from './popover'
export { recipe } from './recipe'
