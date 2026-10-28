'use client'

import { AnimatePresence } from 'motion/react'
import { memo, useId } from 'react'
import { cn } from '../../../../core'
import { usePrefersReducedMotion } from '../../../../hooks/use-prefers-reduced-motion'
import * as m from '../../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../../recipes/kata/chart'
import { rangeKeys } from '../../../../utilities'
import { type ChartPaint, fillClass, rawColor, strokeClass } from '../chart-color/paint'
import {
	AREA_FILL_OPACITY,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	REFERENCE_DASH,
} from '../chart-constants'
import type { ChartLineSeries } from '../chart-geometry/line'
import {
	AREA_FADE,
	AREA_UNFADE,
	LINE_DRAW,
	LINE_UNDRAW,
	POINT_POP,
	POINT_UNPOP,
} from '../chart-motion'
import type { PlotRect } from '../chart-orientation'
import { textureClass, textureStyle } from '../chart-pattern-defs'
import { seriesGroupClass } from '../chart-series'
import { useChartMarkEmphasis } from '../context'

/** Shared shape for the static and animated line renderers. @internal */
export type ChartLineMarksProps = {
	list: ChartLineSeries[]
	/** Render the area washes under the lines. */
	fill: boolean
	/** Stroke the markers with a surface outline: set only where dots cross opaque marks (the combo bars); soft fills read cleaner without it. */
	stroke?: boolean
	/** Per-series texture-tile fill URLs, aligned with `list`; a raw color or flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/** The plot rect, sizing the wipe clip an animated dashed line reveals under. */
	plot?: PlotRect
	/**
	 * The series toggled off. The animated lines draw none of them, so a series
	 * that the layout still holds plays its exit. The plain lines ignore it.
	 */
	hidden?: ReadonlySet<number>
}

/** The marker dot's classes: series fill, gaining a stroke in the surface color only where a dot crosses opaque marks. @internal */
function markerClass(paint: ChartPaint, stroke: boolean): string {
	return cn(fillClass(paint), stroke && k.mark.stroke)
}

/** A line segment's shared presentation, dashed for a dashed series. @internal */
function segmentProps(paint: ChartPaint, dashed: boolean | undefined) {
	return {
		fill: 'none',
		stroke: rawColor(paint),
		strokeWidth: LINE_STROKE_WIDTH,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		// The reference-line dash, so a dashed data line and a dashed rule read as one idiom.
		strokeDasharray: dashed ? REFERENCE_DASH : undefined,
		className: cn(strokeClass(paint)),
	} as const
}

/** The fade of an area wash, held at module scope so each render reuses it. @internal */
const AREA_HIDDEN = { opacity: 0 }

/** @internal */
const AREA_SHOWN = { opacity: 1 }

/** @internal */
const AREA_EXIT = { opacity: 0, transition: AREA_UNFADE }

/** How far a stroke paints past its path: its half-width, and its round cap. @internal */
const WIPE_REACH = LINE_STROKE_WIDTH / 2

/** The draw of a solid stroke along its own length. @internal */
const LINE_HIDDEN = { pathLength: 0 }

/** @internal */
const LINE_SHOWN = { pathLength: 1 }

/**
 * The stroke un-draws along its own length (the draw-on reversed) when a data
 * change swaps the marks generation.
 *
 * @internal
 */
const LINE_EXIT = { pathLength: 0, transition: LINE_UNDRAW }

/**
 * A dashed stroke fades out as a solid one un-draws. One wipe clip reveals each
 * dashed series, so the clip cannot take one series out alone.
 *
 * @internal
 */
const DASH_EXIT = { opacity: 0, transition: LINE_UNDRAW }

/** The pop of a point marker. @internal */
const POINT_HIDDEN = { r: 0, opacity: 0 }

/** @internal */
const POINT_SHOWN = { r: MARKER_RADIUS, opacity: 1 }

/** @internal */
const POINT_EXIT = { r: 0, opacity: 0, transition: POINT_UNPOP }

/** The options that each series body of one marks layer shares. @internal */
type LineBodyOptions = {
	/** Render the area washes under the lines. */
	fill: boolean
	/** Stroke the markers with a surface outline. */
	stroke: boolean
	/** Whether the `texture` prop is on. */
	textureActive: boolean
	/** Reveal the marks through motion; off, they are plain SVG. */
	animated: boolean
	/**
	 * Mount the marks at rest, and remove them with no exit: the reader asks for
	 * reduced motion, or the render is on the server or is the hydration render.
	 * The draw (`pathLength`), the pop (`r`), and the wash fade are no transform,
	 * so the reduced-motion config of motion does not skip them.
	 */
	still: boolean
}

/** Props for {@link LineSegment}. @internal */
type LineSegmentProps = Pick<LineBodyOptions, 'animated' | 'still'> & {
	d: string | undefined
	paint: ChartPaint
	dashed: boolean | undefined
	/** The wipe clip that an animated dashed line reveals under. */
	clip: string | undefined
}

/**
 * One run of a series' stroke. An animated solid stroke draws itself along its
 * own length. An animated dashed stroke holds its pattern and reveals under the
 * wipe clip.
 *
 * @internal
 */
function LineSegment({ d, paint, dashed, clip, animated, still }: LineSegmentProps) {
	if (animated && !dashed) {
		return (
			<m.path
				data-slot="chart-line"
				d={d}
				{...segmentProps(paint, false)}
				initial={still ? false : LINE_HIDDEN}
				animate={LINE_SHOWN}
				exit={still ? undefined : LINE_EXIT}
				transition={LINE_DRAW}
			/>
		)
	}

	if (animated) {
		return (
			<m.path
				data-slot="chart-line"
				d={d}
				clipPath={clip}
				{...segmentProps(paint, true)}
				exit={still ? undefined : DASH_EXIT}
			/>
		)
	}

	return <path data-slot="chart-line" d={d} clipPath={clip} {...segmentProps(paint, dashed)} />
}

/** Props for {@link LineSeriesBody}: one series, in plain values so the memo holds. @internal */
type LineSeriesBodyProps = LineBodyOptions &
	Pick<ChartLineSeries, 'label' | 'paint' | 'geometry' | 'markers' | 'dashed'> & {
		/** The texture tile fill URL, if any. */
		patternFill: string | undefined
		/** The wipe clip that an animated dashed line reveals under. */
		clip: string | undefined
	}

/**
 * The washes, strokes, and markers of one series. Memoized on plain values, so
 * an emphasis change renders only the group class around it, not each mark of
 * the chart. A dashed stroke holds its pattern and reveals under the wipe clip;
 * a solid one draws itself along its own length.
 *
 * @internal
 */
const LineSeriesBody = memo(function LineSeriesBody({
	label,
	paint,
	geometry,
	markers,
	dashed,
	patternFill,
	clip,
	fill,
	stroke,
	textureActive,
	animated,
	still,
}: LineSeriesBodyProps) {
	const points = markers ? geometry.points : geometry.isolated

	const color = rawColor(paint)

	const areaStyle = textureStyle(patternFill)

	const areaClass = cn(fillClass(paint), textureClass(textureActive, patternFill))

	const dotClass = markerClass(paint, stroke)

	return (
		<>
			{fill &&
				rangeKeys(geometry.areas.length, `${label}-area`).map((key, index) =>
					animated ? (
						<m.path
							key={key}
							data-slot="chart-area"
							d={geometry.areas[index]}
							stroke="none"
							fill={color}
							fillOpacity={AREA_FILL_OPACITY}
							style={areaStyle}
							className={areaClass}
							initial={still ? false : AREA_HIDDEN}
							animate={AREA_SHOWN}
							exit={still ? undefined : AREA_EXIT}
							transition={AREA_FADE}
						/>
					) : (
						<path
							key={key}
							data-slot="chart-area"
							d={geometry.areas[index]}
							stroke="none"
							fill={color}
							fillOpacity={AREA_FILL_OPACITY}
							style={areaStyle}
							className={areaClass}
						/>
					),
				)}

			{rangeKeys(geometry.segments.length, `${label}-seg`).map((key, index) => (
				<LineSegment
					key={key}
					d={geometry.segments[index]}
					paint={paint}
					dashed={dashed}
					clip={clip}
					animated={animated}
					still={still}
				/>
			))}

			{rangeKeys(points.length, `${label}-pt`).map((key, index) =>
				animated ? (
					<m.circle
						key={key}
						data-slot="chart-point"
						cx={points[index]?.x}
						cy={points[index]?.y}
						fill={color}
						strokeWidth={MARKER_RING_WIDTH}
						className={dotClass}
						initial={still ? false : POINT_HIDDEN}
						animate={POINT_SHOWN}
						exit={still ? undefined : POINT_EXIT}
						transition={POINT_POP}
					/>
				) : (
					<circle
						key={key}
						data-slot="chart-point"
						cx={points[index]?.x}
						cy={points[index]?.y}
						r={MARKER_RADIUS}
						fill={color}
						strokeWidth={MARKER_RING_WIDTH}
						className={dotClass}
					/>
				),
			)}
		</>
	)
})

/**
 * One group for each series: the emphasis class on the group, and the memoized
 * body inside it. Only the group reads the emphasis. A series in `hidden` takes
 * no group. @internal
 */
function lineSeriesGroups(
	list: ChartLineSeries[],
	lit: (series: number) => boolean,
	fills: (string | undefined)[] | undefined,
	options: LineBodyOptions,
	clip?: string,
	hidden?: ReadonlySet<number>,
) {
	return list.map(({ index, label, paint, geometry, markers, dashed }, seriesIndex) =>
		hidden?.has(index) ? null : (
			<g key={index} data-slot="chart-line-series" className={seriesGroupClass(!lit(index))}>
				<LineSeriesBody
					label={label}
					paint={paint}
					geometry={geometry}
					markers={markers}
					dashed={dashed}
					patternFill={fills?.[seriesIndex]}
					clip={dashed ? clip : undefined}
					{...options}
				/>
			</g>
		),
	)
}

/** The plain-SVG lines: the cheap default with no motion runtime work. @internal */
export function ChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
}: ChartLineMarksProps) {
	const { lit } = useChartMarkEmphasis()

	return lineSeriesGroups(list, lit, fills, {
		fill,
		stroke,
		textureActive,
		animated: false,
		still: false,
	})
}

/**
 * The Framer Motion lines: each segment draws itself, washes and dots follow.
 * A toggle that hides a series runs that series' reveal in reverse: the stroke
 * un-draws, a dashed stroke fades, and the wash and the dots fade out. A data
 * change does the same for each series, through the marks generation.
 *
 * @internal
 */
export function AnimatedChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
	plot,
	hidden,
}: ChartLineMarksProps) {
	// A dashed line can't ride the `pathLength` draw: motion reveals a stroke by
	// driving its `strokeDasharray`, which would overwrite the dash and settle
	// solid. So a dashed series holds its dash static and reveals under a clip
	// that wipes across the band axis: the reference rule's transform-reveal
	// trick, one draw-on beat with the solid lines' stroke.
	const wipeId = `chart-line-wipe-${useId()}`

	const wipe = plot && list.some((series) => series.dashed)

	const { lit } = useChartMarkEmphasis()

	const still = usePrefersReducedMotion()

	return (
		<>
			{wipe && (
				<defs>
					<clipPath id={wipeId} data-slot="chart-line-wipe">
						{/* The clip stays on after the wipe, so it holds the plot and the reach
						    of the stroke past it. A line at the ceiling or the floor keeps its
						    whole stroke. */}
						<m.rect
							x={plot.x - WIPE_REACH}
							y={plot.y - WIPE_REACH}
							width={plot.width + 2 * WIPE_REACH}
							height={plot.height + 2 * WIPE_REACH}
							style={{ originX: 0 }}
							// The server renders the wipe open, or the dashed line is clipped away
							// until the motion features load.
							initial={still ? false : { scaleX: 0 }}
							animate={{ scaleX: 1 }}
							exit={{ scaleX: 0, transition: LINE_UNDRAW }}
							transition={LINE_DRAW}
						/>
					</clipPath>
				</defs>
			)}

			{/* Each series is its own presence, so a hidden one plays its exit while the
			    rest stay. `propagate` passes the exit of a data change through. */}
			<AnimatePresence propagate>
				{lineSeriesGroups(
					list,
					lit,
					fills,
					{ fill, stroke, textureActive, animated: true, still },
					wipe ? `url(#${wipeId})` : undefined,
					hidden,
				)}
			</AnimatePresence>
		</>
	)
}
