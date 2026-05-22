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
 * **The applicator pattern.** Every entry is a function that takes an
 * archetype's standard pieces plus the kata's per-call configuration and
 * returns the `k` surface the kata exports. `defineApplicator` in
 * `core/recipe` covers the common case — a single `defineRecipe` call
 * with caller overlays — and `control` / `check` collapse to one-liner
 * declarations through it. Three archetypes don't fit that shape and
 * hand-roll instead:
 *
 *   - `popover` — no `defineRecipe` calls; returns a bundle of class
 *     fragments anchored by an optional caller `text` override.
 *   - `segment` — two `defineRecipe` calls (one for the outer chrome,
 *     one for each item) wrapped in a bundle alongside the raw indicator
 *     fragment.
 *   - `panel` — the caller supplies their own `defineRecipe` results
 *     (each kata's panel has different variants); the applicator wraps
 *     them with the standard title / description / header / body /
 *     actions / close slot bundle.
 *
 * These three are exceptions around one architecture, not separate
 * paradigms.
 *
 * **Genkei sourcing during the mock.** `control`, `check`, `popover`, and
 * `segment` currently import their archetype fragments from `genkei/*`
 * so the un-converted kata continue to type-check against the existing
 * layer. `panel` is the first applicator fully migrated — its content
 * was moved out of genkei in the panel round. When the migration
 * completes, the remaining four follow and `genkei/` dissolves.
 *
 * **What this barrel surfaces.** Applicators only. Engine primitives
 * (`defineRecipe`, `defineColors`, `palette`, `VariantPropsOf`, …) stay
 * in `core/recipe` and kata import them from there. A kata that doesn't
 * fit any archetype calls `defineRecipe` directly; routing it through a
 * katakana alias would conflate "the applicator layer" with "the recipe
 * engine."
 *
 * Type exports follow real consumer needs, not surface parity. `control`
 * and `segment` expose variant types because their consumer components
 * import them; `check`, `popover`, and `panel` don't — checkbox / radio
 * compute their own variants (extra axes the applicator doesn't own),
 * and panel's input shape is generic per-kata.
 */

export { check } from './check'
export { type ControlVariants, control } from './control'
export { panel } from './panel'
export { popover } from './popover'
export { type SegmentControlVariants, type SegmentItemVariants, segment } from './segment'
