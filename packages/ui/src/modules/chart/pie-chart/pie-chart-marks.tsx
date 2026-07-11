'use client'

import { motion } from 'motion/react'
import { type MouseEvent, type PointerEvent, useId } from 'react'
import { cn } from '../../../core'
import { formatPercent } from '../../../utilities'
import type { SlotPaint } from '../engine/chart-color/paint'
import { TICK_CHAR_WIDTH } from '../engine/chart-constants'
import { type PieSlice, pieCentroidRadius, segmentLabelFits } from '../engine/chart-geometry/pie'
import { SLICE_FADE, SLICE_SWEEP, SLICE_UNFADE, SLICE_UNSWEEP } from '../engine/chart-motion'
import { textureClass, textureStyle } from '../engine/chart-pattern-defs'
import type { ChartTooltipTrigger } from '../engine/chart-tooltip'
import { useChartHover } from '../engine/context'

/** One placed segment label: its slice and resolved text. @internal */
export type PieSegmentLabel = {
	slice: PieSlice
	text: string
}

/** A slice group's dim classes — on the wrapper, so motion's inline opacity composes. @internal */
export function sliceGroupClass(emphasis: number | null, index: number): string {
	return cn('transition-opacity', emphasis !== null && emphasis !== index && 'opacity-25')
}

/**
 * When the sweep reveal reaches `mid` degrees: the moment a label's slice is
 * half uncovered, so text fades in just as its slice appears under it.
 *
 * @internal
 */
export function sweepDelay(mid: number): number {
	return (mid / 360) * SLICE_SWEEP.duration
}

/** Shared shape for the static and animated segment-label renderers. @internal */
type PieSegmentLabelsProps = {
	items: PieSegmentLabel[]
	paints: SlotPaint[]
	animate: boolean
	/** The legend-emphasised slice; other labels dim with their slices. */
	emphasis: number | null
}

/**
 * The fit-gated labels set inside the slices. Text on a mark's own fill is
 * the one place ink follows the series colour — each hue's `onFill` pick is
 * white-first, dropping to near-black only where white can't clear the 3:1
 * graphical floor against that fill (see `kata/chart`). Under `animate` a label
 * fades in as the sweep uncovers its slice.
 *
 * @internal
 */
export function PieSegmentLabels({ items, paints, animate, emphasis }: PieSegmentLabelsProps) {
	return (
		<g data-slot="chart-segment-labels" pointerEvents="none">
			{items.map(({ slice, text }) => {
				const shared = {
					'data-slot': 'chart-segment-label',
					x: slice.centroid.x,
					y: slice.centroid.y,
					textAnchor: 'middle' as const,
					dominantBaseline: 'central' as const,
					className: cn('font-semibold text-sm tabular-nums', paints[slice.index]?.onFill),
				}

				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
						{animate ? (
							<motion.text
								{...shared}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: SLICE_UNFADE }}
								transition={{ ...SLICE_FADE, delay: sweepDelay(slice.mid) }}
							>
								{text}
							</motion.text>
						) : (
							<text {...shared}>{text}</text>
						)}
					</g>
				)
			})}
		</g>
	)
}

/** Options for {@link segmentLabelItems}. @internal */
type SegmentLabelOptions = {
	show: boolean
	slices: PieSlice[]
	radius: number
	innerRadius: number
}

/** Resolves and fit-gates the segment labels; empty when the switch is off. @internal */
export function segmentLabelItems({
	show,
	slices,
	radius,
	innerRadius,
}: SegmentLabelOptions): PieSegmentLabel[] {
	if (!show || radius <= 0) return []

	const depth = innerRadius > 0 ? radius - innerRadius : radius

	return slices.flatMap((slice) => {
		const text = formatPercent(slice.share)

		const centroidRadius = pieCentroidRadius(radius, innerRadius, slice.share)

		const fits = segmentLabelFits(text.length, slice.share, centroidRadius, depth, TICK_CHAR_WIDTH)

		return fits ? [{ slice, text }] : []
	})
}

/** Shared shape for the static and animated slice renderers. @internal */
type PieChartMarksProps = {
	slices: PieSlice[]
	paints: SlotPaint[]
	animate: boolean
	/** The pie center, which the sweep mask rotates about. */
	center: { x: number; y: number }
	/** The outer radius the sweep mask must cover. */
	radius: number
	/** The legend-emphasised slice; the others dim against it. */
	emphasis: number | null
	/** Per-slice texture-tile fill URLs, indexed like `paints`; a flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which gives each slice a pointer cursor and toggles the readout off on a
	 * second click of the same slice.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Reports a click on a slice by data index — the plumbing behind the pie's
	 * public `onCategoryClick`. Rides either trigger (after the `'click'`
	 * trigger's own pin/dismiss) and gives the slices a pointer cursor.
	 */
	onIndexClick?: (index: number) => void
	/**
	 * Emphasises a slice while the pointer sits on it (`null` clears) — the same
	 * channel the legend hover drives, so hovering a slice isolates it and recedes
	 * the rest exactly as its legend chip does.
	 */
	onEmphasis?: (index: number | null) => void
}

/**
 * The slice paths — clean fills with no separator stroke. The gap between
 * neighbours is geometric, cut into the arc angles by {@link pieSlices}, so the
 * real surface behind the chart shows through it — nothing painted to mismatch
 * a tinted or glass card. A gapless hit wedge behind each slice takes the
 * pointer across that channel, splitting it down the middle between the two
 * neighbours, so sweeping the gap moves the hover index rather than dropping
 * the tooltip — the way a grouped bar chart holds its readout across the gap
 * between bars. The visible slice, drawn over its wedge, still wins the pointer
 * on its own body and keeps the hover brightness.
 *
 * @remarks Under `animate` the disc wipes in clockwise from the top: a mask
 * stroke thick enough to cover the whole disc draws itself (`pathLength`
 * 0 → 1), the same self-drawing reveal as the line chart — the pie sweeps in
 * along its angular axis the way a line draws along x. The slices themselves
 * stay static, so hover and dimming behave identically mid-reveal.
 * @internal
 */
export function PieChartMarks({
	slices,
	paints,
	animate,
	center,
	radius,
	emphasis,
	fills,
	textureActive = false,
	trigger = 'hover',
	onIndexClick,
	onEmphasis,
}: PieChartMarksProps) {
	const { index: active, set } = useChartHover()

	const sweepId = useId()

	const click = trigger === 'click'

	const clickable = click || onIndexClick !== undefined

	return (
		<g
			data-slot="chart-slices"
			// Leaving the pie clears the isolation whichever way the tooltip opens; the
			// hover-tracked readout clears with it, a click-pinned one stays put.
			onPointerLeave={() => {
				onEmphasis?.(null)

				if (!click) set(null, null)
			}}
		>
			{animate && (
				<mask id={sweepId}>
					{/* The circle's stroke starts at 3 o'clock; the group turns it to 12. */}
					<g transform={`rotate(-90 ${center.x} ${center.y})`}>
						<motion.circle
							cx={center.x}
							cy={center.y}
							r={radius / 2}
							fill="none"
							stroke="#fff"
							strokeWidth={radius + 4}
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							// The sweep runs backwards on a data change — the disc un-wipes to
							// nothing before the new pie sweeps in.
							exit={{ pathLength: 0, transition: SLICE_UNSWEEP }}
							transition={SLICE_SWEEP}
						/>
					</g>
				</mask>
			)}

			<g mask={animate ? `url(#${sweepId})` : undefined}>
				{slices.map((slice) => {
					// Anchor the readout at the pointer within the SVG; the click branch
					// toggles — a second click of the shown slice clears it. A click also
					// reports through `onIndexClick` on either trigger, after the toggle,
					// so one gesture drives both the readout and the consumer's activation.
					const at = (event: PointerEvent<SVGPathElement> | MouseEvent<SVGPathElement>) => {
						const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()

						if (!box) return

						set(slice.index, { x: event.clientX - box.left, y: event.clientY - box.top })
					}

					const activate = () => onIndexClick?.(slice.index)

					// Pointing a slice isolates it either way the tooltip opens; the hover
					// trigger also tracks the readout onto it.
					const emphasize = () => onEmphasis?.(slice.index)

					const handlers = click
						? {
								onClick: (event: MouseEvent<SVGPathElement>) => {
									if (active === slice.index) set(null, null)
									else at(event)

									activate()
								},
								onPointerEnter: emphasize,
							}
						: {
								onClick: onIndexClick ? activate : undefined,
								onPointerEnter: () => {
									set(slice.index, slice.centroid)

									emphasize()
								},
								onPointerMove: at,
							}

					return (
						<g key={slice.index} className={sliceGroupClass(emphasis, slice.index)}>
							{/* The gapless wedge sits behind the visible slice and takes the
							    pointer only where the slice recedes — its half of each channel —
							    so sweeping across the gap keeps the tooltip instead of dropping
							    it onto the bare surface. The visible slice, drawn over it, wins
							    the pointer on its own body and isolates itself on hover. */}
							<path
								data-slot="chart-slice-hit"
								d={slice.hit}
								fill="none"
								pointerEvents="all"
								className={cn(clickable && 'cursor-pointer')}
								{...handlers}
							/>

							<path
								data-slot="chart-slice"
								d={slice.d}
								style={textureStyle(fills?.[slice.index])}
								className={cn(
									paints[slice.index]?.fill,
									textureClass(textureActive, fills?.[slice.index]),
									clickable && 'cursor-pointer',
								)}
								{...handlers}
							/>
						</g>
					)
				})}
			</g>
		</g>
	)
}
