'use client'

import { type KeyboardEvent, useCallback } from 'react'
import { nextIndexForKey } from '../../utilities/keyboard-navigation'
import { type ChartOrientation, project } from './chart-orientation'
import type { ChartPoint } from './context'

/** Options for {@link useChartKeyboard}. @internal */
export type ChartKeyboardOptions = {
	/** Category count — the roving range; `0` disables the keys (a pie has no band axis). */
	count: number
	/** Each category's band-axis center. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the tooltip's anchor. */
	snapPoints: number[][]
	/** The chart's orientation, so the arrows follow the band axis and the point projects right. */
	orientation: ChartOrientation
	/** The current hover index — the cursor moves on from here. */
	index: number | null
	/** Writes the shared hover, exactly as the pointer does. */
	set: (index: number | null, point: ChartPoint | null, onData?: boolean) => void
}

/**
 * Keyboard roving over a cartesian chart's categories: the arrow keys (plus
 * Home / End, wrapping) move a cursor along the band axis and write the same
 * hover context the pointer does — so the crosshair and tooltip answer the
 * keyboard with no change to either overlay. Escape clears the hover and drops
 * focus.
 *
 * The roving axis is the transpose of the value axis: a vertical chart's
 * categories run across x, so Left / Right move them; a horizontal chart's run
 * down y, so Up / Down do. The synthesised point crosses the category's band
 * centre with its first value, so the tooltip lands on a real mark.
 *
 * @returns The plot region's `onKeyDown`; a no-op for the keys it doesn't own,
 * so it never swallows a Tab.
 * @internal
 */
export function useChartKeyboard({
	count,
	bandPositions,
	snapPoints,
	orientation,
	index,
	set,
}: ChartKeyboardOptions) {
	return useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key === 'Escape') {
				set(null, null)

				event.currentTarget.blur()

				return
			}

			// Categories run perpendicular to the value axis, so the roving axis is
			// the orientation's transpose.
			const navAxis = orientation === 'vertical' ? 'horizontal' : 'vertical'

			const next = nextIndexForKey(event.key, index ?? -1, count, { orientation: navAxis })

			if (next === null) return

			event.preventDefault()

			// Anchor on the category's first value so the tooltip meets a real mark;
			// an empty category falls back to the band's baseline end.
			const value = snapPoints[next]?.[0] ?? 0

			set(next, project(orientation, value, bandPositions[next] ?? 0), true)
		},
		[count, bandPositions, snapPoints, orientation, index, set],
	)
}
