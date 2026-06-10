/**
 * Segment bridge: segmented-control archetype shared by `<Segment>`
 * (standalone) and `<Tabs variant="segment">`. A pure bridge: it receives
 * the `segment` token bundle and returns the kata `k` surface, importing
 * only the recipe engine and declaring the token shape it needs as its own
 * contract; katakana references kiso in neither value nor type.
 *
 *   - `control`: outer chrome recipe, callable as `control({ size })`
 *   - `item`: per-segment recipe, callable as `item({ size })`
 *   - `indicator`: class fragment for the sliding indicator
 */

import type { ClassValue } from 'clsx'
import { defineRecipe } from '../../core/recipe'

/** Size step keys; mirrors the kiso `sun` step scale. */
type Step = 'sm' | 'md' | 'lg'

/** A size-axed recipe fragment (base chrome + per-step sizing). */
type Sized = { base?: ClassValue; size: Record<Step, ClassValue> }

/** The slice of the `segment` token bundle the bridge reads. */
type SegmentTokens = {
	control: Sized
	item: Sized
	indicator: ClassValue
}

export function segment(t: SegmentTokens) {
	const control = defineRecipe({ ...t.control, defaults: { size: 'md' } })

	const item = defineRecipe({ ...t.item, defaults: { size: 'md' } })

	return { control, item, indicator: t.indicator }
}
