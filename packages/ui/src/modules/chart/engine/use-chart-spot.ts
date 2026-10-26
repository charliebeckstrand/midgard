'use client'

import { useState } from 'react'

/**
 * Holds the spot of one series for the lift of its recede. A static renderer
 * draws the lit marks of a receded series again as one spot over the series.
 * When the recede lifts, the spot is gone, but the series fades back up from
 * its receded strength. The lit marks would then drop to that strength and
 * fade up with the rest.
 *
 * The hook keeps the last spot while the series is not receded. The renderer
 * draws it with `spotClass(dimmed)`, which hides it when the fade ends. A spot
 * that goes while the series stays receded goes at once, because no fade runs
 * below it.
 *
 * @remarks The spot must keep its identity across the renders of one emphasis,
 * such as a string or a mark from a memoized list. A new spot updates the held
 * state during render, which costs one more render pass.
 *
 * @param spot - The spot of this render, or `null` when no mark is lit over the series.
 * @param dimmed - Whether the series recedes.
 * @returns The spot to draw, or `null`.
 * @internal
 */
export function useChartSpot<T>(spot: T | null, dimmed: boolean): T | null {
	const [held, setHeld] = useState(spot)

	if (!dimmed) return held

	if (held !== spot) setHeld(spot)

	return spot
}
