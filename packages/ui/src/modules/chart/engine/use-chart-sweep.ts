'use client'

import { type CSSProperties, startTransition, useEffect, useMemo, useState } from 'react'
import { k } from '../../../recipes/kata/chart'

const { duration } = k.motion

/**
 * The longest delay of the sweep, in seconds. The last mark starts its wash
 * this long after the first, however many marks the layer draws, so a large
 * atlas does not draw out the reveal.
 */
const SWEEP_SPAN = 0.3

/**
 * How long the sweep takes end to end, in seconds: the longest delay, plus the
 * `duration-400` wash that the region and cell classes run after it. The hook
 * retires the delays after it.
 *
 * @internal
 */
export const SWEEP_SETTLE = SWEEP_SPAN + duration[400]

/**
 * The delay steps of the sweep, one shared style object per step. A position
 * rounds to its nearest step, so thousands of regions share a small set of
 * style identities, and a memoized mark compares equal on its style. Sixteen
 * steps across the span put each step near one frame apart, so the wave reads
 * smooth.
 */
const SWEEP_STEPS = 16

const SWEEP_STYLES: CSSProperties[] = Array.from({ length: SWEEP_STEPS }, (_, step) => ({
	transitionDelay: `${Math.round((step / (SWEEP_STEPS - 1)) * SWEEP_SPAN * 1000)}ms`,
}))

/** The wash timing of one mark, by its index; `undefined` for no delay. @internal */
export type WashDelay = (index: number) => CSSProperties | undefined

/** No sweep, or a sweep that has played out: every mark washes at once. */
const AT_ONCE: WashDelay = () => undefined

/**
 * The wash delays of an `animate="sweep"` reveal. Each mark starts its color
 * wash after a delay in proportion to its position along the sweep: `0` washes
 * first and `1` washes last. The map gives each region its place from east to
 * west, and the heatmap gives each cell its column.
 *
 * The delays are for the reveal only. A transition reads its delay from the
 * style it lands in, so a delay that stayed would hold back each later legend
 * toggle or data change by the place of the mark. When the sweep has played
 * out, the hook retires the delays, and every later change washes at once. The
 * retirement is one pass over the layer, committed as a transition, because
 * nothing waits for it.
 *
 * @remarks Reduced motion needs nothing here: the `motion-reduce` fallback of
 * the wash classes drops the transition that the delay belongs to.
 *
 * @param positions - Each mark's position along the sweep, index-aligned with
 * the marks, or `null` for no sweep. A thunk, so the positions are read only
 * when the reveal starts. Hold its identity across renders.
 * @param revealed - Whether the marks have flipped to their colors, which
 * starts the wash and the clock that retires the delays.
 * @returns The delay style of each mark, by index.
 * @internal
 */
export function useChartSweep(
	positions: (() => readonly (number | null)[]) | null,
	revealed: boolean,
): WashDelay {
	const sweep = positions !== null

	// One way, so a resize never plays the sweep again.
	const [swept, setSwept] = useState(false)

	useEffect(() => {
		if (!sweep || !revealed) return

		const timer = setTimeout(() => startTransition(() => setSwept(true)), SWEEP_SETTLE * 1000)

		return () => clearTimeout(timer)
	}, [sweep, revealed])

	// The delays must be in place in the commit that flips the colors, because
	// that commit starts the wash. Before the flip there is no wash to delay.
	return useMemo(() => {
		if (positions === null || !revealed || swept) return AT_ONCE

		const at = positions()

		return (index) => SWEEP_STYLES[Math.round((at[index] ?? 0) * (SWEEP_STEPS - 1))]
	}, [positions, revealed, swept])
}
