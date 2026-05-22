/**
 * Segment applicator — segmented-control archetype shared by `<Segment>`
 * (standalone) and `<Tabs variant="segment">`. Returns the control / item
 * recipe pair plus the indicator fragment.
 *
 * Unlike `control` / `check`, segment isn't a single `defineRecipe` wrap —
 * it's a two-recipe bundle (control wraps the outer chrome; item wraps
 * each segment), so it doesn't go through `defineApplicator`. The bundle
 * pattern mirrors `popover`.
 *
 * Returns the kata `k` surface:
 *   - `control` — outer chrome recipe, callable as `control({ size })`
 *   - `item` — per-segment recipe, callable as `item({ size })`
 *   - `indicator` — class fragment for the sliding indicator
 */

import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { segment as segmentFragments } from '../genkei/segment'

const { control: controlFragments, item: itemFragments, indicator } = segmentFragments

const control = defineRecipe({ ...controlFragments, defaults: { size: 'md' } })

const item = defineRecipe({ ...itemFragments, defaults: { size: 'md' } })

export function segment() {
	return { control, item, indicator }
}

export type SegmentControlVariants = VariantPropsOf<typeof control>
export type SegmentItemVariants = VariantPropsOf<typeof item>
