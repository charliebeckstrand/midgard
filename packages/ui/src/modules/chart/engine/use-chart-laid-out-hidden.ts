'use client'

import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { sameMembers } from './use-chart-toggle'

/**
 * The series that the layout leaves out: the hidden set, but held for `exit`
 * seconds after a toggle hides a series. In that time the hidden series plays
 * its exit, and the rest of the chart keeps its place. Then the layout closes
 * the gap. A toggle that shows a series lays out at once, so the layout makes
 * room before the series reveals.
 *
 * @remarks Only a toggle that adds to the held set waits. A second hide during
 * the hold starts the wait again from that toggle. A show during the hold lays
 * out each toggle at once. A static chart, or a reduced-motion preference,
 * plays no exit, so it never holds.
 * @param hidden - The series toggled off, from {@link useChartSeriesToggle}.
 * @param animate - The `animate` prop of the chart.
 * @param exit - How long the exit of a hidden series takes, in seconds.
 * @internal
 */
export function useLaidOutHidden(
	hidden: ReadonlySet<number>,
	animate: boolean | undefined,
	exit: number | undefined,
): ReadonlySet<number> {
	const still = usePrefersReducedMotion()

	const hold = animate && !still ? (exit ?? 0) : 0

	const [laid, setLaid] = useState(hidden)

	const waits =
		hold > 0 && !sameMembers(laid, hidden) && [...laid].every((index) => hidden.has(index))

	// A set during render replaces this render at once.
	if (!waits && laid !== hidden) setLaid(hidden)

	useEffect(() => {
		if (!waits) return

		const timer = setTimeout(() => setLaid(hidden), hold * 1000)

		return () => clearTimeout(timer)
	}, [waits, hidden, hold])

	return waits ? laid : hidden
}
