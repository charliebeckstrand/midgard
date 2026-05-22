/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * **Mock — viability experiment, not the final shape.** The full proposal is
 * to dissolve `genkei/` and route every kata through this layer. Today only
 * two entries are wired: a generic `recipe` (catch-all, thin re-export of
 * `defineRecipe`) and `control` (the text-input branch of the Control
 * archetype). The remaining archetypes — `popover`, `panel`, `segment` — and
 * the check-input control branch will land here when the experiment graduates.
 *
 * Shape of a katakana entry: a function that takes a kata's per-call
 * configuration (extra base, slots, defaults, axis overlays) and returns the
 * `k` surface ready for the kata to export. The applicator owns the
 * archetype's frame composition, fragment wiring, and sub-recipe attachment;
 * the kata stays a thin call site.
 */

export { type ControlVariants, control } from './control'
export { recipe } from './recipe'
