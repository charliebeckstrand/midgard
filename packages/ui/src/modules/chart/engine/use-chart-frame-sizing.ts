'use client'

import {
	type FrameReserve,
	type FrameSizing,
	type PlotFrameRef,
	usePlotFrame,
} from '../../../hooks'
import { type ChartChrome, type ChartPolicy, chartFramePolicy } from './chart-tier'

/** The inputs of {@link useChartFrameSizing}. @internal */
export type ChartFrameSizingInput = {
	/** An explicit drawing width, or `undefined` to measure the container. */
	width: number | undefined
	/** The policy that the plot box measures through, resolved from the props. */
	sizing: FrameSizing
	/**
	 * The legend bands beside the plot. It takes a share of an explicit `width`,
	 * so the plot measures the width that remains.
	 */
	aside: boolean
	/**
	 * The `width / height` that the figure carries as CSS `aspect-ratio`. It is set
	 * only when a stacked legend or no legend shares the aspect box, and `null` or
	 * `undefined` otherwise.
	 */
	aspect: number | null | undefined
	/** The header and the stacked legend that the figure lays out around the plot. */
	chrome: ChartChrome
	/** The tick target of the density step, which the tier can only lower. */
	tickTarget: number
}

/** What {@link useChartFrameSizing} returns. @internal */
export type ChartFrameSize = {
	/** Attach to the plot box, so that the hook measures it. */
	ref: PlotFrameRef
	/** The drawing width in px; `0` until the width is measured. */
	width: number
	/** The drawing height in px; `0` until the width is measured. */
	height: number
	/** How the plot box reserves its height from its own width, or `null` for a pixel height. */
	reserve: FrameReserve | null
	/** The tier of the measured box, and the budgets that the tier sets. */
	policy: ChartPolicy
}

/**
 * Measures a chart frame through its resolved `sizing`, and resolves the tier of
 * the measured box. The cartesian charts, the scatter, and the pie share it. Each
 * chart resolves its own sizing from its props first, because a pie folds its
 * legend into the box by its own rule.
 *
 * The tier reads the box through {@link chartFramePolicy}. A stacked aspect-fill
 * figure therefore resolves the tier from its `width / ratio` less the chrome,
 * and not from the plot height that the chrome changes. In the free-form `fill`
 * mode, the tier resolves the decisions that change the chrome from the width
 * alone.
 *
 * @remarks Destructure `ref` where you call the hook. The compiler then does not
 * read the other fields as refs.
 * @internal
 */
export function useChartFrameSizing(input: ChartFrameSizingInput): ChartFrameSize {
	const { sizing } = input

	const { ref, width, height, reserve } = usePlotFrame(input.width, sizing, input.aside)

	const policy = chartFramePolicy({
		width,
		height,
		aspect: input.aspect,
		chrome: input.chrome,
		tickTarget: input.tickTarget,
		fill: sizing.mode === 'fill',
	})

	return { ref, width, height, reserve, policy }
}
