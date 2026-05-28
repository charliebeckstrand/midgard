/**
 * Katakana 片仮名 — the recipe applicator layer.
 *
 * Five archetypes are wired: `control` (text-input branch of the Control
 * archetype), `check` (check-input branch, covering checkbox and radio),
 * `popover` (floating-overlay archetype), `segment` (segmented-control
 * archetype shared by Segment and Tabs), and `panel` (panel-bundle
 * archetype shared by Dialog, Drawer, and Sheet).
 *
 * **The applicator pattern.** Every entry is a function that takes an
 * archetype's standard pieces plus the kata's per-call configuration and
 * returns the `k` surface the kata exports. `defineApplicator` covers
 * the common case — a single `defineRecipe` call with caller overlays —
 * so `control` and `check` collapse to one-liner declarations. The
 * remaining three hand-roll for their own reason:
 *
 *   - `popover` — no `defineRecipe` calls; returns a bundle of class
 *     fragments anchored by an optional caller `text` override.
 *   - `segment` — two `defineRecipe` calls (one for the outer chrome,
 *     one for each item), wrapped in a bundle alongside the raw
 *     indicator fragment.
 *   - `panel` — caller supplies their own `defineRecipe` results (each
 *     kata's panel has different variants); the applicator wraps them
 *     in the standard title / description / header / body / actions /
 *     close slot bundle.
 *
 * Three exceptions around one architecture, not separate paradigms.
 *
 * **Kiso archetypes are the raw-fragment data layer.** Each applicator
 * imports its archetype's fragments from `kiso/<archetype>` — control
 * from `kiso/control`, popover from `kiso/popover`, and so on. The two
 * layers have distinct concerns: kiso archetypes store the shared
 * class-fragment data, katakana wraps it in callable applicator
 * functions. Kata that need a subset of an archetype's fragments —
 * combobox / listbox / date-picker use control's input / density / size
 * without the full chrome — reach `kiso/<archetype>` directly, the same
 * way kata that don't fit any archetype reach `defineRecipe` directly.
 * Both reaches are honest layering.
 *
 * **What the barrel surfaces.** Applicators only. Engine primitives
 * (`defineRecipe`, `defineColors`, `palette`, `VariantProps`, …) stay
 * in `core/recipe`; kata import them from there. A kata that doesn't
 * fit any archetype calls `defineRecipe` directly — routing it through
 * a katakana alias would conflate the applicator layer with the recipe
 * engine.
 *
 * Type exports follow real consumer needs, not surface parity. `control`
 * and `segment` expose variant types because consumer components import
 * them. `check`, `popover`, and `panel` don't — checkbox and radio
 * compute their own variants from `VariantProps<typeof k>` (extra
 * axes the applicator doesn't own), and panel's input shape is generic
 * per-kata.
 */

export { check } from './check'
export { type ControlVariants, control } from './control'
export { panel } from './panel'
export { popover } from './popover'
export { type SegmentControlVariants, type SegmentItemVariants, segment } from './segment'
