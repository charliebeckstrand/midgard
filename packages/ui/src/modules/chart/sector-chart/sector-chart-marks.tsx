'use client'

import { motion } from 'motion/react'
import { type MouseEvent, type PointerEvent, useId, useRef } from 'react'
import { cn } from '../../../core'
import { useHoverAcrossScroll } from '../../../hooks'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { useTouchTap } from '../../../hooks/use-touch-tap'
import type { SlotPaint } from '../engine/chart-color/paint'
import { TICK_CHAR_WIDTH } from '../engine/chart-constants'
import { type PieSlice, pieCentroidRadius, segmentLabelFits } from '../engine/chart-geometry/pie'
import { SLICE_FADE, SLICE_SWEEP, SLICE_UNFADE, SLICE_UNSWEEP } from '../engine/chart-motion'
import { textureClass, textureStyle } from '../engine/chart-pattern-defs'
import { seriesGroupClass } from '../engine/chart-series'
import type { ChartTooltipTrigger } from '../engine/chart-tooltip'
import { useChartHoverStore, useChartSeriesEmphasis, useChartSeriesFocus } from '../engine/context'
import { toFrame } from '../engine/use-chart-pointer'

/** One placed segment label: its slice and resolved text. @internal */
export type SectorSegmentLabel = {
	slice: PieSlice
	text: string
}

/**
 * A slice group's recede classes, from {@link seriesGroupClass} — on the
 * wrapper, so motion's inline opacity composes. A held selection wins: it
 * lights only its own slices, and a hover never re-lights them. Else the
 * emphasized slice lights alone. @internal
 */
export function sliceGroupClass(
	emphasis: number | null,
	index: number,
	selected: ReadonlySet<number> | null = null,
): string {
	const dim =
		selected !== null && selected.size > 0
			? !selected.has(index)
			: emphasis !== null && emphasis !== index

	return seriesGroupClass(dim)
}

/**
 * When the sweep reveal reaches `mid` degrees: the moment a label's slice is
 * half uncovered. Text fades in just as its slice appears under it.
 *
 * @internal
 */
export function sweepDelay(mid: number): number {
	return (mid / 360) * SLICE_SWEEP.duration
}

/** Shared shape for the static and animated segment-label renderers. @internal */
type SectorSegmentLabelsProps = {
	items: SectorSegmentLabel[]
	paints: SlotPaint[]
	animate: boolean
	/** The held selection, or `null`; unselected labels dim with their slices. */
	selected?: ReadonlySet<number> | null
}

/**
 * The fit-gated labels set inside the slices. Text on a mark's own fill is
 * the one place ink follows the series color. Each hue's `label` pick is
 * white-first, dropping to near-black only where white can't clear the 3:1
 * graphical floor against that fill (see `kata/chart`). Under `animate` a label
 * fades in as the sweep uncovers its slice. A label dims with its slice under
 * the series emphasis of the frame.
 *
 * @internal
 */
export function SectorSegmentLabels({
	items,
	paints,
	animate,
	selected = null,
}: SectorSegmentLabelsProps) {
	const emphasis = useChartSeriesEmphasis()

	return (
		<g data-slot="chart-segment-labels" pointerEvents="none">
			{items.map(({ slice, text }) => {
				const shared = {
					'data-slot': 'chart-segment-label',
					x: slice.centroid.x,
					y: slice.centroid.y,
					textAnchor: 'middle' as const,
					dominantBaseline: 'central' as const,
					className: cn('font-semibold text-sm tabular-nums', paints[slice.index]?.label),
				}

				return (
					<g key={slice.index} className={sliceGroupClass(emphasis, slice.index, selected)}>
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
	/** Formats a `0..1` share, in the ambient locale. */
	percent: (share: number) => string
}

/** Resolves and fit-gates the segment labels; empty when the switch is off. @internal */
export function segmentLabelItems({
	show,
	slices,
	radius,
	innerRadius,
	percent,
}: SegmentLabelOptions): SectorSegmentLabel[] {
	if (!show || radius <= 0) return []

	const depth = innerRadius > 0 ? radius - innerRadius : radius

	return slices.flatMap((slice) => {
		const text = percent(slice.share)

		const centroidRadius = pieCentroidRadius(radius, innerRadius, slice.share)

		const fits = segmentLabelFits(text.length, slice.share, centroidRadius, depth, TICK_CHAR_WIDTH)

		return fits ? [{ slice, text }] : []
	})
}

/**
 * A client point in the units that the pie draws in, which are the units that
 * the readout anchors in. It maps through an ancestor scale or zoom, as the
 * cartesian pointer does. A drawing with no layout size (jsdom) maps by the
 * offset alone.
 *
 * @internal
 */
function drawingPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
	const drawing = { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight }

	return toFrame(drawing, svg.getBoundingClientRect(), clientX, clientY)
}

/**
 * The slice that a node under the pointer belongs to, or `null` off the slices.
 * Each child of `wedges` is the group of one slice, in the order of `slices`,
 * and holds its hit wedge and its visible slice.
 *
 * @internal
 */
function sliceAt(
	wedges: SVGGElement | null,
	slices: PieSlice[],
	node: Element | null,
): PieSlice | null {
	const group = node?.closest(
		'[data-slot="chart-slice-hit"], [data-slot="chart-slice"]',
	)?.parentNode

	if (!wedges || !group || group.parentNode !== wedges) return null

	return slices[Array.prototype.indexOf.call(wedges.children, group)] ?? null
}

/** Shared shape for the static and animated slice renderers. @internal */
type SectorChartMarksProps = {
	slices: PieSlice[]
	paints: SlotPaint[]
	animate: boolean
	/** The pie center, which the sweep mask rotates about. */
	center: { x: number; y: number }
	/** The outer radius the sweep mask must cover. */
	radius: number
	/** The held selection, or `null`; unselected slices dim until an emphasis wins. */
	selected?: ReadonlySet<number> | null
	/** Per-slice texture-tile fill URLs, indexed like `paints`; a flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on
	 * `'click'`. A pinning click gives each slice a pointer cursor and toggles the
	 * readout off on a second click of the same slice.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Reports a click on a slice by data index — the plumbing behind the pie's
	 * public `onCategoryClick`. Rides either trigger (after the `'click'`
	 * trigger's own pin/dismiss) and gives the slices a pointer cursor. A touch
	 * reports from its tap, and pins nothing.
	 */
	onIndexClick?: (index: number) => void
}

/**
 * The slice paths — clean fills with no separator stroke. The gap between
 * neighbors is geometric, cut into the arc angles by {@link pieSlices}. The
 * real surface behind the chart thus shows through it, with nothing painted to
 * mismatch a tinted or glass card. A gapless hit wedge behind each slice takes
 * the pointer across that channel, and splits it down the middle between the
 * two neighbors. A sweep across the gap therefore moves the hover index rather
 * than dropping the tooltip. A grouped bar chart holds its readout across the
 * gap between bars the same way. The visible slice, drawn over its wedge, still
 * wins the pointer on its own body and keeps the hover brightness.
 *
 * @remarks Under `animate` the disc wipes clockwise from the top. A mask
 * stroke thick enough to cover the whole disc draws itself (`pathLength`
 * 0 → 1). It is the same self-drawing reveal as the line chart. The pie sweeps
 * in along its angular axis the way a line draws along x. The slices themselves
 * stay static, so hover and dimming behave identically mid-reveal.
 * @internal
 */
export function SectorChartMarks({
	slices,
	paints,
	animate,
	center,
	radius,
	selected = null,
	fills,
	textureActive = false,
	trigger = 'hover',
	onIndexClick,
}: SectorChartMarksProps) {
	// The store, not a subscription: the slices write the hover and read the shown
	// index only in a click, so a pointer move does not render them.
	const hoverStore = useChartHoverStore()

	const set = hoverStore.set

	// The frame's series emphasis, the same channel the legend hover drives. A
	// hovered slice isolates itself and recedes the rest, as its legend chip does.
	const emphasis = useChartSeriesEmphasis()

	const onEmphasis = useChartSeriesFocus()

	const sweepId = useId()

	// The sweep (`pathLength`) is no transform, so the reduced-motion config of
	// motion does not skip it. Under reduced motion the mask mounts whole.
	const still = usePrefersReducedMotion()

	const click = trigger === 'click'

	const clickable = click || onIndexClick !== undefined

	// Whether the pointer is over the slices, so the scroll rescue re-reads only a
	// hover that the pointer owns.
	const inside = useRef(false)

	// The slice groups, so the scroll rescue can name the slice under the pointer.
	const wedges = useRef<SVGGElement>(null)

	// The slice that the last press landed on, which a tap reports.
	const pressed = useRef<number | null>(null)

	// A touch activates from its tap, and a mouse or a pen from its click. A
	// touch reads nothing from the pie: it opens no readout and isolates no slice.
	const touch = useTouchTap(() => {
		if (pressed.current !== null) onIndexClick?.(pressed.current)
	})

	// A scroll slides the pie under a still pointer and fires no pointer event.
	// The rescue hides the readout and the isolation while the page moves. When
	// the page settles, it reads the slice under the pointer off the DOM, as the
	// map does. A pinned readout keeps its place, so the rescue runs under the
	// hover trigger only.
	useHoverAcrossScroll(
		!click,
		() => {
			if (!inside.current) return

			set(null, null)

			onEmphasis(null)
		},
		(clientX, clientY) => {
			if (!inside.current) return

			const slice = sliceAt(wedges.current, slices, document.elementFromPoint(clientX, clientY))

			const svg = wedges.current?.ownerSVGElement

			if (slice === null || !svg) return

			set(slice.index, drawingPoint(svg, clientX, clientY))

			onEmphasis(slice.index)
		},
	)

	return (
		<g
			data-slot="chart-slices"
			// Leaving the pie clears the isolation whichever way the tooltip opens; the
			// hover-tracked readout clears with it, a click-pinned one stays put. A
			// touch opened neither, so its leave clears nothing.
			onPointerLeave={(event) => {
				if (event.pointerType === 'touch') return

				inside.current = false

				onEmphasis(null)

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
							initial={still ? false : { pathLength: 0 }}
							animate={{ pathLength: 1 }}
							// The sweep runs backwards on a data change — the disc un-wipes to
							// nothing before the new pie sweeps in.
							exit={{ pathLength: 0, transition: SLICE_UNSWEEP }}
							transition={SLICE_SWEEP}
						/>
					</g>
				</mask>
			)}

			<g ref={wedges} mask={animate ? `url(#${sweepId})` : undefined}>
				{slices.map((slice) => {
					// Anchor the readout at the pointer within the SVG; the click branch
					// toggles — a second click of the shown slice clears it. A click also
					// reports through `onIndexClick` on either trigger, after the toggle,
					// so one gesture drives both the readout and the consumer's activation.
					const at = (event: PointerEvent<SVGPathElement> | MouseEvent<SVGPathElement>) => {
						const svg = event.currentTarget.ownerSVGElement

						if (!svg) return

						set(slice.index, drawingPoint(svg, event.clientX, event.clientY))
					}

					const activate = () => onIndexClick?.(slice.index)

					// A mouse or a pen that points a slice isolates it either way the tooltip
					// opens; the hover trigger also tracks the readout onto it.
					const emphasize = () => onEmphasis(slice.index)

					// The slice that a touch press lands on, which its tap reports.
					const press = (event: PointerEvent<SVGPathElement>) => {
						pressed.current = slice.index

						touch.onPointerDown(event)
					}

					const handlers = click
						? {
								onPointerDown: press,
								onPointerUp: touch.onPointerUp,
								onPointerCancel: touch.onPointerCancel,
								onPointerMove: touch.onPointerMove,
								onTouchEnd: touch.onTouchEnd,
								// A tap only activates. Its click is canceled, so it does not pin
								// the readout.
								onClick: (event: MouseEvent<SVGPathElement>) => {
									if (touch.fromTouch()) return

									if (hoverStore.get().index === slice.index) set(null, null)
									else at(event)

									activate()
								},
								onPointerEnter: (event: PointerEvent<SVGPathElement>) => {
									if (event.pointerType !== 'touch') emphasize()
								},
							}
						: {
								...(onIndexClick && {
									onPointerDown: press,
									onPointerUp: touch.onPointerUp,
									onPointerCancel: touch.onPointerCancel,
									onClick: () => {
										if (!touch.fromTouch()) activate()
									},
									onTouchEnd: touch.onTouchEnd,
								}),
								onPointerEnter: (event: PointerEvent<SVGPathElement>) => {
									if (event.pointerType === 'touch') return

									inside.current = true

									set(slice.index, slice.centroid)

									emphasize()
								},
								onPointerMove: (event: PointerEvent<SVGPathElement>) => {
									touch.onPointerMove(event)

									if (event.pointerType !== 'touch') at(event)
								},
							}

					return (
						<g key={slice.index} className={sliceGroupClass(emphasis, slice.index, selected)}>
							{/* The gapless wedge sits behind the visible slice and takes the
							    pointer only where the slice recedes: its half of each channel.
							    A sweep across the gap therefore keeps the tooltip instead of
							    dropping it onto the bare surface. The visible slice, drawn over it,
							    wins the pointer on its own body and isolates itself on hover. */}
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
