'use client'

import { useCallback, useMemo, useState } from 'react'
import { useReportedChange } from '../../../hooks/use-reported-change'
import { keyByOccurrence, toggleItem } from '../../../utilities'

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
 * differ in how they hide their mark.
 *
 * @internal
 */
function useChartToggleSet(): ChartToggleSet {
	const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set())

	const toggle = useCallback((index: number) => {
		setHidden((current) => toggleItem(current, index))
	}, [])

	return { hidden, toggle }
}

/** The legend's series switchboard state. @internal */
export type ChartSeriesToggle = ChartToggleSet

/** Whether two index sets hold the same members. @internal */
function sameMembers(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
	return a.size === b.size && [...a].every((index) => b.has(index))
}

/**
 * Owns which series are toggled off, the legend interaction that every chart
 * shares. The emphasis of a hovered or focused legend entry is not here. The
 * frame owns it, so a legend hover does not run the chart body. The chart gives
 * the hidden set to the frame, because a hidden series cannot hold the emphasis.
 *
 * @remarks The toggle keeps each series by its key, not by its position. A
 * series list that drops or moves an entry therefore keeps each series on or
 * off as the reader left it. The hidden set that the chart reads and reports
 * holds the current positions of those keys. A repeated key names each
 * occurrence apart.
 * @param keys - The identity of each series, in series order.
 * @param onHiddenChange - Reports each committed hidden set to the caller,
 * also when a change to `keys` moves the positions.
 * @internal
 */
export function useChartSeriesToggle(
	keys: readonly string[],
	onHiddenChange?: (hidden: ReadonlySet<number>) => void,
): ChartSeriesToggle {
	const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => new Set())

	// One string for the key list, so the derived set keeps its identity across a
	// render that hands new arrays with the same keys.
	const signature = JSON.stringify(keyByOccurrence(keys).map(({ key }) => key))

	const occurrences = useMemo(() => JSON.parse(signature) as string[], [signature])

	const hidden = useMemo(
		() =>
			new Set(
				occurrences.flatMap((key, index) => (hiddenKeys.has(key) ? [index] : [])),
			) as ReadonlySet<number>,
		[occurrences, hiddenKeys],
	)

	const toggle = useCallback(
		(index: number) => {
			const key = occurrences[index]

			if (key !== undefined) setHiddenKeys((current) => toggleItem(current, key))
		},
		[occurrences],
	)

	// Read from the committed set rather than from `toggle`, because the set is
	// written through an updater. A chart with every series shown says nothing.
	useReportedChange(hidden, onHiddenChange, sameMembers)

	return { hidden, toggle }
}

/** The reference switchboard's toggle state. @internal */
export type ChartReferenceToggle = ChartToggleSet

/**
 * Which reference rules are toggled off — the reference chips' switchboard,
 * keyed by each rule's own index in the `reference` array. Unlike the series
 * toggle it carries no emphasis of its own. A chip's recede lives in the frame's
 * {@link ChartEmphasis} channel, reached only through the chip. The legend gates
 * that chip on this hidden set, so an off chip never recedes to a rule it just pulled.
 *
 * @internal
 */
export function useChartReferenceToggle(): ChartReferenceToggle {
	return useChartToggleSet()
}
