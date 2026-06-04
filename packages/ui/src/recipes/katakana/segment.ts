/**
 * Segment bridge — segmented-control archetype shared by `<Segment>`
 * (standalone) and `<Tabs variant="segment">`. A pure bridge: it receives
 * the `segment` token bundle and returns the kata `k` surface, importing
 * only the recipe engine.
 *
 * Two `defineRecipe` calls wrapped in a bundle: `control` for the outer
 * chrome, `item` for each segment, plus the raw `indicator` fragment.
 *
 *   - `control` — outer chrome recipe, callable as `control({ size })`
 *   - `item` — per-segment recipe, callable as `item({ size })`
 *   - `indicator` — class fragment for the sliding indicator
 */

import { defineRecipe, type VariantProps } from '../../core/recipe'
import type { Segment } from '../kiso/segment'

export function segment(t: Segment) {
	const control = defineRecipe({ ...t.control, defaults: { size: 'md' } })

	const item = defineRecipe({ ...t.item, defaults: { size: 'md' } })

	return { control, item, indicator: t.indicator }
}

export type SegmentControlVariants = VariantProps<ReturnType<typeof segment>['control']>
export type SegmentItemVariants = VariantProps<ReturnType<typeof segment>['item']>
