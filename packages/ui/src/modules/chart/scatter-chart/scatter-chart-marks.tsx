'use client'

import { memo, useMemo } from 'react'
import { cn } from '../../../core'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../recipes/kata/chart'
import { rangeKeys } from '../../../utilities'
import { type ChartPaint, fillClass, rawColor } from '../engine/chart-color/paint'
import { BUBBLE_FILL_OPACITY, MARKER_RING_WIDTH } from '../engine/chart-constants'
import { type ScatterMark, scatterDiscLayers } from '../engine/chart-geometry/scatter'
import { POINT_POP } from '../engine/chart-motion'
import { seriesGroupClass, spotClass } from '../engine/chart-series'
import { useChartMarkEmphasis } from '../engine/context'
import { useChartSpot } from '../engine/use-chart-spot'

/**
 * The opacity a receded disc fades to: the numeric twin of the `opacity-25`
 * utility the bar and line dims use. The animated discs therefore recede to the
 * same depth. Those discs drive opacity through motion, where a class would lose
 * to the inline value.
 *
 * @internal
 */
const DIM_OPACITY = 0.25

/** One scatter series' render inputs. @internal */
export type ChartScatterSeries = {
	/** The series' own index in the caller's list: the React key, unique where two series share a label. */
	index: number
	label: string
	paint: ChartPaint
	marks: ScatterMark[]
	/** Whether the series carries the bubble size encoding: sized discs fill translucently. */
	sized: boolean
}

/** Shared shape for the static and animated scatter renderers. @internal */
export type ScatterChartMarksProps = {
	list: ChartScatterSeries[]
}

/**
 * A disc's presentation: series fill under a surface ring, translucent once
 * sized. A palette slot fills through its class; a raw color fills inline, as
 * the bar and line marks do.
 *
 * @internal
 */
function markProps(paint: ChartPaint, sized: boolean) {
	return {
		strokeWidth: MARKER_RING_WIDTH,
		fillOpacity: sized ? BUBBLE_FILL_OPACITY : undefined,
		fill: rawColor(paint),
		className: cn(fillClass(paint), k.mark.stroke),
	}
}

/**
 * The plain-SVG scatter discs. A plain (unsized) series draws as a few
 * `<path>` layers of surface-ringed subfigures, one per point, instead of a
 * circle element apiece. A ten-thousand-point cloud is therefore a few DOM nodes
 * per series, not ten thousand. The layers keep the paint order of separate
 * circles ({@link scatterDiscLayers}). Where two discs overlap, the later disc
 * and its ring thus cover the earlier disc, as the animated discs do. A sized
 * (bubble) series keeps a circle per point. Its fill is translucent, so overlaps
 * must composite disc over disc, which one filled path can't do. A bubble field
 * is also the sparse, few-mark case the collapse doesn't pay off on.
 *
 * Isolation stays per-datum without re-drawing a plain cloud. The pointed disc
 * recedes every other, so each layer of the series dims. The one lit disc
 * re-draws at full strength over it, as a single overlay circle rather than a
 * rebuild. That reads identically to dimming every sibling. When the dim lifts,
 * that disc stays until the layers have faded back up. The series layers
 * are memoized on `list`. A pointer crossing only re-runs this component through
 * the emphasis context, never the chart body, so it rebuilds nothing. It swaps a
 * dim class and one overlay disc, not the ten thousand marks under it.
 *
 * @internal
 */
export function ScatterChartMarks({ list }: ScatterChartMarksProps) {
	const { mark, lit } = useChartMarkEmphasis()

	// Stable across emphasis changes: the chart body holds `list` steady while
	// the pointer moves, so a plain series' disc layers survive a crossing
	// untouched; a sized series builds none.
	const layers = useMemo(
		() => list.map((series) => (series.sized ? [] : scatterDiscLayers(series.marks))),
		[list],
	)

	return list.map(({ index, label, paint, marks, sized }, seriesIndex) => {
		const props = markProps(paint, sized)

		if (sized) {
			return (
				<g key={index} data-slot="chart-scatter-series">
					{rangeKeys(marks.length, label).map((key, datum) => (
						<circle
							key={key}
							data-slot="chart-scatter-point"
							cx={marks[datum]?.x}
							cy={marks[datum]?.y}
							r={marks[datum]?.r}
							{...props}
							// The disc the pointer isolates keeps full strength; its siblings and
							// every other series recede: the dim rides the class, no inline
							// opacity to lose to.
							className={cn(props.className, seriesGroupClass(!lit(index, datum)))}
						/>
					))}
				</g>
			)
		}

		// A whole-series emphasis (a legend hover, `datum: null`) lights its series
		// and dims the rest; a single pointed disc (`datum` set) dims every series,
		// its own included, and the lit disc re-draws over the dim below.
		const seriesLit = mark !== null && mark.series === index && mark.datum === null

		const spot =
			mark !== null && mark.series === index && mark.datum !== null ? marks[mark.datum] : undefined

		return (
			<ScatterDiscSeries
				key={index}
				layers={layers[seriesIndex] ?? []}
				spot={spot ?? null}
				dimmed={mark !== null && !seriesLit}
				paint={paint}
			/>
		)
	})
}

/** Props for {@link ScatterDiscSeries}. @internal */
type ScatterDiscSeriesProps = {
	/** The disc layers of the series ({@link scatterDiscLayers}). */
	layers: string[]
	/** The pointed disc that draws over the receded series, or `null`. */
	spot: ScatterMark | null
	/** Whether the series layers recede. */
	dimmed: boolean
	paint: ChartPaint
}

/**
 * One plain scatter series: its disc layers and the spot of its pointed disc.
 * The spot stays over its disc while a lift of the recede fades the layers back
 * up ({@link useChartSpot}).
 *
 * @internal
 */
function ScatterDiscSeries({ layers, spot, dimmed, paint }: ScatterDiscSeriesProps) {
	const props = markProps(paint, false)

	const held = useChartSpot(spot, dimmed)

	return (
		<g data-slot="chart-scatter-series">
			{rangeKeys(layers.length, 'layer').map((key, layer) => (
				<path
					key={key}
					data-slot="chart-scatter-discs"
					d={layers[layer]}
					{...props}
					className={cn(props.className, seriesGroupClass(dimmed))}
				/>
			))}

			{held.spot && (
				<circle
					data-slot="chart-scatter-point"
					cx={held.spot.x}
					cy={held.spot.y}
					r={held.spot.r}
					{...props}
					className={cn(props.className, spotClass(held.shown))}
				/>
			)}
		</g>
	)
}

/** The pop of a disc from its center. @internal */
const DISC_HIDDEN = { r: 0, opacity: 0 }

/** @internal */
const DISC_POP = { ...POINT_POP, delay: 0 }

/** The disc under reduced motion: a new radius applies at once. @internal */
const DISC_STILL = { ...DISC_POP, r: k.motion.instant }

/**
 * The Framer Motion scatter discs: each pops from its center on mount, on the
 * point-marker beat but with no line draw to wait behind. Under reduced motion
 * the discs mount at rest and change size at once. The radius is no transform,
 * so the reduced-motion config of motion does not skip it.
 *
 * @internal
 */
export function AnimatedScatterChartMarks({ list }: ScatterChartMarksProps) {
	const { lit } = useChartMarkEmphasis()

	const still = usePrefersReducedMotion()

	return list.map(({ index, label, paint, marks, sized }) => (
		<g key={index} data-slot="chart-scatter-series">
			{rangeKeys(marks.length, label).map((key, datum) => (
				<AnimatedDisc
					key={key}
					cx={marks[datum]?.x}
					cy={marks[datum]?.y}
					r={marks[datum]?.r ?? 0}
					paint={paint}
					sized={sized}
					lit={lit(index, datum)}
					still={still}
				/>
			))}
		</g>
	))
}

/** Props for {@link AnimatedDisc}: one disc, in plain values so the memo holds. @internal */
type AnimatedDiscProps = {
	cx: number | undefined
	cy: number | undefined
	r: number
	paint: ChartPaint
	sized: boolean
	lit: boolean
	still: boolean
}

/**
 * One popped disc. Memoized on plain values and the series paint, so an
 * emphasis change renders only the discs that dim or light, not each disc.
 *
 * @internal
 */
const AnimatedDisc = memo(function AnimatedDisc({
	cx,
	cy,
	r,
	paint,
	sized,
	lit,
	still,
}: AnimatedDiscProps) {
	return (
		<m.circle
			data-slot="chart-scatter-point"
			cx={cx}
			cy={cy}
			{...markProps(paint, sized)}
			initial={still ? false : DISC_HIDDEN}
			// Motion owns the disc's opacity through the pop-in, so the dim rides the
			// same channel (receding to the class dim's depth) rather than a class
			// the inline value would override.
			animate={{ r, opacity: lit ? 1 : DIM_OPACITY }}
			transition={still ? DISC_STILL : DISC_POP}
		/>
	)
})
