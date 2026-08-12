'use client'

import { useEffect } from 'react'
import { MAP_PRELOAD_DWELL_MS } from './engine/map-constants'
import type { MapHoverTarget } from './engine/map-hover/target'

/**
 * Reports the region the pointer settles on, so a caller can warm what opening
 * it will need. Reads the hover target the provider already holds rather than
 * tracking its own: the pointer and the keyboard cursor both write that target,
 * so one reader answers both inputs — the pair `Tab`'s `onPreload` takes intent
 * from.
 *
 * @remarks
 * The dwell and its cancel are the effect's own shape: the timer arms when the
 * target lands on a region and the cleanup clears it when the pointer moves on,
 * so only a region the reader holds warms. The provider pins the target's
 * identity across a same-mark move, so the hold runs from the crossing rather
 * than restarting under every pixel of travel.
 *
 * Deliberately reads the ungated target and not the pointed mark: that one
 * withholds emphasis from a region whose category is unmatched or toggled off,
 * which is a question about data. What a region opens into is not — a state has
 * its counties whether or not it carries a row.
 *
 * @param target - The hover target, region or overlay mark; only regions warm.
 * @param report - Warms the region at a feature index, already latched by the
 * plat; `undefined` on a plat that asked for no warming, which arms no timer.
 *
 * @internal
 */
export function useMapRegionPreload(
	target: MapHoverTarget | null,
	report: ((index: number) => void) | undefined,
): void {
	useEffect(() => {
		if (report === undefined || target === null || target.kind !== 'region') return

		const timer = setTimeout(() => report(target.index), MAP_PRELOAD_DWELL_MS)

		return () => clearTimeout(timer)
	}, [target, report])
}
