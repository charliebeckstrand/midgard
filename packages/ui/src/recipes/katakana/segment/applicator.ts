/**
 * Segment applicator — segmented-control archetype shared by `<Segment>`
 * (standalone) and `<Tabs variant="segment">`.
 *
 * Two `defineRecipe` calls wrapped in a bundle: `control` for the outer
 * chrome, `item` for each segment. The two-recipe shape doesn't fit
 * `defineApplicator`, so segment hand-rolls — same pattern as `popover`.
 *
 * Returns the kata `k` surface:
 *   - `control` — outer chrome recipe, callable as `control({ size })`
 *   - `item` — per-segment recipe, callable as `item({ size })`
 *   - `indicator` — class fragment for the sliding indicator
 */

import { defineRecipe, type VariantProps } from '../../../core/recipe'
import { segment as segmentFragments } from '../../kiso/segment'

const { control: controlFragments, item: itemFragments, indicator } = segmentFragments

const control = defineRecipe({ ...controlFragments, defaults: { size: 'md' } })

const item = defineRecipe({ ...itemFragments, defaults: { size: 'md' } })

export function segment() {
	return { control, item, indicator }
}

export type SegmentControlVariants = VariantProps<typeof control>
export type SegmentItemVariants = VariantProps<typeof item>
