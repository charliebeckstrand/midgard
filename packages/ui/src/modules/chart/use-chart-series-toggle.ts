'use client'

import { useCallback, useState } from 'react'

/** The legend's series switchboard state. @internal */
export type ChartSeriesToggle = {
	/** Indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles an index on or off. */
	toggle: (index: number) => void
	/** Moves the legend emphasis (`null` clears it). */
	setFocus: (index: number | null) => void
	/** The emphasised index while it is still visible; other marks dim against it. */
	emphasis: number | null
}

/**
 * Owns the legend interactions every chart shares: which series are toggled
 * off, and which one is emphasised by a hovered or focused legend entry. A
 * hidden series can't hold the emphasis — dimming everything against an
 * invisible series would read as a broken chart.
 *
 * @internal
 */
export function useChartSeriesToggle(): ChartSeriesToggle {
	const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set())

	const [focus, setFocus] = useState<number | null>(null)

	const toggle = useCallback((index: number) => {
		setHidden((current) => {
			const next = new Set(current)

			if (next.has(index)) {
				next.delete(index)
			} else {
				next.add(index)
			}

			return next
		})
	}, [])

	return {
		hidden,
		toggle,
		setFocus,
		emphasis: focus !== null && !hidden.has(focus) ? focus : null,
	}
}
