'use client'

import { useCallback, useState } from 'react'

/** A toggleable set of hidden indexes — the primitive under both switchboards. @internal */
export type ChartToggleSet = {
	/** Indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles an index on or off. */
	toggle: (index: number) => void
}

/**
 * A set of hidden indexes with an index toggle — the shared core of the series
 * and reference switchboards. Neither the series entries nor the reference chips
 * differ in how they hide their mark; they part only in the emphasis the series
 * layers on top.
 *
 * @internal
 */
function useChartToggleSet(): ChartToggleSet {
	const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set())

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

	return { hidden, toggle }
}

/** The legend's series switchboard state. @internal */
export type ChartSeriesToggle = ChartToggleSet & {
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
	const { hidden, toggle } = useChartToggleSet()

	const [focus, setFocus] = useState<number | null>(null)

	return {
		hidden,
		toggle,
		setFocus,
		emphasis: focus !== null && !hidden.has(focus) ? focus : null,
	}
}

/** The reference switchboard's toggle state. @internal */
export type ChartReferenceToggle = ChartToggleSet

/**
 * Which reference rules are toggled off — the reference chips' switchboard,
 * keyed by each rule's own index in the `reference` array. Unlike the series
 * toggle it carries no emphasis of its own: a chip's recede lives in the frame's
 * {@link ChartEmphasis} channel, reached only through the chip, which the legend
 * gates on this hidden set so an off chip never recedes to a rule it just pulled.
 *
 * @internal
 */
export function useChartReferenceToggle(): ChartReferenceToggle {
	return useChartToggleSet()
}
