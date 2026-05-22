/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * **Mock — viability experiment, not the final shape.** The full proposal is
 * to dissolve `genkei/` and route every kata through this layer. Today five
 * entries are wired: a generic `recipe` (catch-all, thin re-export of
 * `defineRecipe`), `control` (text-input branch of the Control archetype),
 * `check` (check-input branch of the Control archetype, covering checkbox
 * and radio), `popover` (floating-overlay archetype), and `segment`
 * (segmented-control archetype shared by Segment and Tabs). The remaining
 * archetype — `panel` — will land here when the experiment graduates.
 *
 * Shape of a katakana entry: a function that takes a kata's per-call
 * configuration (extra base, slots, defaults, axis overlays) and returns the
 * `k` surface ready for the kata to export. The applicator owns the
 * archetype's frame composition, fragment wiring, and sub-recipe attachment;
 * the kata stays a thin call site.
 *
 * `defineRecipe`-wrapping applicators (`control`, `check`, and every future
 * variant-axis-bearing archetype) collapse to a `defineApplicator(standard)`
 * call. Bundle-returning applicators (`popover`) stay hand-rolled — they
 * don't go through `defineRecipe`.
 *
 * **Genkei sourcing during the mock.** Applicators currently reach into
 * `genkei/*` for their archetype fragments so the un-converted kata
 * continue to type-check against the existing layer. When the migration
 * completes, `genkei/` dissolves and its content folds into the
 * corresponding katakana applicator file.
 *
 * **What this barrel surfaces.** Applicators only. Engine primitives
 * (`defineColors`, `palette`, `VariantPropsOf`, …) stay in `core/recipe`
 * and kata import them from there — re-exporting them through katakana
 * would conflate "the applicator layer" with "the recipe engine."
 */

export { type CheckVariants, check } from './check'
export { type ControlVariants, control } from './control'
export { popover } from './popover'
export { recipe } from './recipe'
export { type SegmentControlVariants, type SegmentItemVariants, segment } from './segment'
