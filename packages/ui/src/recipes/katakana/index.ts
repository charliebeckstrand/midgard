/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * **Mock — viability experiment, not the final shape.** The full proposal is
 * to dissolve `genkei/` and route every kata through this layer when its
 * shape matches an archetype. Today five entries are wired: `control`
 * (text-input branch of the Control archetype), `check` (check-input
 * branch of the Control archetype, covering checkbox and radio), `popover`
 * (floating-overlay archetype), `segment` (segmented-control archetype
 * shared by Segment and Tabs), and `panel` (panel-bundle archetype shared
 * by Dialog, Drawer, and Sheet).
 *
 * Shape of a katakana entry: a function that takes a kata's per-call
 * configuration (extra base, slots, defaults, axis overlays, or — for
 * `panel` — caller-supplied `defineRecipe` results) and returns the `k`
 * surface ready for the kata to export. Three architectural shapes coexist:
 *
 *   - **Applicator owns the recipe** (`control`, `check`) — kata supplies
 *     a thin overlay; the applicator owns the variant axes and forwards
 *     to `defineRecipe` via `defineApplicator` / `applyRecipe`.
 *   - **Applicator owns the bundle** (`popover`, `segment`) — kata calls
 *     a zero- or low-arg function and reads back a pre-built bundle of
 *     class fragments and recipes.
 *   - **Kata owns the recipe** (`panel`) — applicator wraps caller-
 *     supplied `defineRecipe` results in a standard slot bundle.
 *
 * **Genkei sourcing during the mock.** Applicators currently reach into
 * `genkei/*` for their archetype fragments so the un-converted kata
 * continue to type-check against the existing layer. When the migration
 * completes, `genkei/` dissolves and its content folds into the
 * corresponding katakana applicator file.
 *
 * **What this barrel surfaces.** Applicators only. Engine primitives
 * (`defineRecipe`, `defineColors`, `palette`, `VariantPropsOf`, …) stay
 * in `core/recipe` and kata import them from there. A kata that doesn't
 * fit any archetype calls `defineRecipe` directly; routing it through a
 * katakana alias would conflate "the applicator layer" with "the recipe
 * engine."
 */

export { type CheckVariants, check } from './check'
export { type ControlVariants, control } from './control'
export { type PanelInput, panel } from './panel'
export { type PopoverConfig, popover } from './popover'
export { type SegmentControlVariants, type SegmentItemVariants, segment } from './segment'
