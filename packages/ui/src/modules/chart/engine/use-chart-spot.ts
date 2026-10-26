'use client'

import { useState } from 'react'

/**
 * Holds the spot of one series for the lift of its recede. A static renderer
 * draws the lit marks of a receded series again as one spot over the series.
 * When the recede lifts, the spot is gone, but the series path fades back up
 * from its receded strength. The lit marks would then drop to that strength
 * and fade up with the rest.
 *
 * The hook keeps the last spot while the series is not receded. The renderer
 * draws it with `spotClass`, which hides it when the fade ends. A spot
 * that goes while the series stays receded goes at once, because no fade runs
 * below it.
 *
 * @param spot - The spot of this render, or `null` when no mark is lit over the series.
 * @param dimmed - Whether the series path recedes.
 * @returns The spot to draw, and whether it is shown or left behind by the lift.
 * @internal
 */
export function useChartSpot<T>(
	spot: T | null,
	dimmed: boolean,
): { spot: T | null; shown: boolean } {
	const [held, setHeld] = useState<T | null>(() => spot)

	if (!dimmed) return { spot: held, shown: false }

	if (held !== spot) setHeld(() => spot)

	return { spot, shown: spot !== null }
}
