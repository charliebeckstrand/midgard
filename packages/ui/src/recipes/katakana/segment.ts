/**
 * Segment bridge: segmented-control archetype shared by `<Segment>`
 * (standalone) and `<Tabs variant="segment">`. A pure bridge: it receives
 * the `segment` token bundle and returns the kata `k` surface. It declares
 * the token shape it needs as its own contract. Katakana references kiso in
 * neither value nor type.
 *
 *   - `control`: outer chrome classes
 *   - `item`: per-segment classes
 *   - `indicator`: class fragment for the sliding indicator
 *
 * The control and the items follow the nearest density scope through stepped
 * classes, so the surface has no size axis.
 */

import type { ClassValue } from 'clsx'

/** A recipe fragment with its base classes. */
type Fragment = { base: ClassValue }

/** The slice of the `segment` token bundle the bridge reads. */
type SegmentTokens = {
	control: Fragment
	item: Fragment
	indicator: ClassValue
}

/**
 * Build the kata `k` surface for a segmented control: the `control` chrome, the
 * per-segment `item` classes, and the sliding `indicator` fragment.
 */
export function segment(t: SegmentTokens) {
	return { control: t.control.base, item: t.item.base, indicator: t.indicator }
}
