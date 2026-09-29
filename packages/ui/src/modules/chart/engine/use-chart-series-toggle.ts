'use client'

import { useCallback, useMemo, useState } from 'react'
import { useReportedChange } from '../../../hooks/use-reported-change'
import { keyByOccurrence, toggleItem } from '../../../utilities'

/**
 * The state of a legend switchboard: the series or the reference rules toggled
 * off, and the toggle.
 *
 * @internal
 */
type ChartToggleSet = {
	/** Indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles an index on or off. */
	toggle: (index: number) => void
}

/** Whether two index sets hold the same members. @internal */
function sameMembers(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
	return a.size === b.size && [...a].every((index) => b.has(index))
}

/**
 * The toggle core that the series and the reference rules share. It keeps each
 * entry by its key, not by its position, and reads the hidden set back as the
 * current positions of those keys.
 *
 * @param keys - The unique identity of each entry, in list order.
 * @internal
 */
function useKeyedToggle(keys: readonly string[]): ChartToggleSet {
	const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => new Set())

	// One string for the key list, so the derived set keeps its identity across a
	// render that hands new arrays with the same keys.
	const signature = JSON.stringify(keys)

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

	return { hidden, toggle }
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
): ChartToggleSet {
	const toggleSet = useKeyedToggle(keyByOccurrence(keys).map(({ key }) => key))

	// Read from the committed set rather than from `toggle`, because the set is
	// written through an updater. A chart with every series shown says nothing.
	useReportedChange(toggleSet.hidden, onHiddenChange, sameMembers)

	return toggleSet
}

/**
 * Which reference rules are toggled off — the reference chips' switchboard. It
 * carries no emphasis of its own. A chip's recede lives in the frame's
 * {@link ChartEmphasis} channel, reached only through the chip. The legend gates
 * that chip on this hidden set, so an off chip never recedes to a rule it just pulled.
 *
 * @remarks The toggle keeps each rule by its key ({@link ruleKeys}), not by its
 * position, as the series toggle does. A `reference` list that drops or moves a
 * rule therefore keeps each rule on or off as the reader left it.
 * @param keys - The unique key of each rule, in `reference` order.
 * @internal
 */
export function useChartReferenceToggle(keys: readonly string[]): ChartToggleSet {
	return useKeyedToggle(keys)
}
