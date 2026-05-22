/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * **Mock — viability experiment, not the final shape.** The full proposal is
 * to dissolve `genkei/` and route every kata through this layer. Today three
 * entries are wired: a generic `recipe` (catch-all, thin re-export of
 * `defineRecipe`), `control` (text-input branch of the Control archetype),
 * and `popover` (floating-overlay archetype). The remaining archetypes —
 * `panel`, `segment`, and the check-input control branch — will land here
 * when the experiment graduates.
 *
 * Shape of a katakana entry: a function that takes a kata's per-call
 * configuration (extra base, slots, defaults, axis overlays) and returns the
 * `k` surface ready for the kata to export. The applicator owns the
 * archetype's frame composition, fragment wiring, and sub-recipe attachment;
 * the kata stays a thin call site.
 *
 * `VariantPropsOf` is re-exported so kata that declare extra axes (e.g.
 * `textarea`'s `resize` / `autoResize`) can derive their full prop union
 * without reaching back to `core/recipe`.
 */

export type { VariantPropsOf } from '../../core/recipe'
export { type ControlVariants, control } from './control'
export { popover } from './popover'
export { recipe } from './recipe'
