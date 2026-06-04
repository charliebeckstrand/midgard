/**
 * Katakana 片仮名 — the archetype layer.
 *
 * Each archetype is a sub-folder that owns both its raw class-fragment
 * data and the applicator that wraps it: `control` (the Control family —
 * text-input plus the `check` branch covering checkbox and radio),
 * `popover` (floating overlay), `segment` (segmented control shared by
 * Segment and Tabs), `panel` (panel bundle shared by Dialog, Drawer, and
 * Sheet), and `slider` (fragment-only — a shared colour table with no
 * applicator).
 *
 * **One archetype, one folder.** The folder `index.ts` exports the
 * fragment bundle under the archetype name; `applicator.ts` exports the
 * callable applicator(s). Fragments hold Tailwind class strings; the
 * applicator composes them through the recipe engine. (Folding the
 * fragments in is why katakana carries literal classes — there is no
 * longer a separate `kiso/<archetype>` data tier.)
 *
 * **Two reaches, one path.** A kata that consumes a whole archetype
 * imports its applicator from this barrel (`from '../katakana'`). A kata
 * that needs only a subset of fragments imports them from the archetype
 * folder (`from '../katakana/<archetype>'`) — control's input / density /
 * size for combobox / listbox / date-picker / select / switch, panel's
 * surface / layout for dialog / drawer / sheet / box, slider's colour for
 * slider / slider-range. Both reaches are honest layering; neither dips
 * into the other's namespace.
 *
 * **The applicator pattern.** `defineApplicator` covers the common case —
 * a single `defineRecipe` call with caller overlays — so `control` and
 * `check` collapse to one-liner declarations. The remaining three
 * hand-roll for their own reason:
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
 * **What the barrel surfaces.** Applicators and the variant types real
 * consumers import. Engine primitives (`defineRecipe`, `defineColors`,
 * `definePalette`, `VariantProps`, …) stay in `core/recipe`; kata import
 * them from there. A kata that doesn't fit any archetype calls
 * `defineRecipe` directly — routing it through a katakana alias would
 * conflate the archetype layer with the recipe engine.
 *
 * Type exports follow real consumer needs, not surface parity. `control`
 * and `segment` expose variant types because consumer components import
 * them. `check`, `popover`, and `panel` don't — checkbox and radio
 * compute their own variants from `VariantProps<typeof k>` (extra axes
 * the applicator doesn't own), and panel's input shape is generic
 * per-kata.
 */

export { type ControlVariants, check, control } from './control/applicator'
export { panel } from './panel/applicator'
export { popover } from './popover/applicator'
export {
	type SegmentControlVariants,
	type SegmentItemVariants,
	segment,
} from './segment/applicator'
