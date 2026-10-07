'use client'

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
	/** Stroke the markers with a surface outline — set only where dots cross opaque marks (the combo bars); soft fills read cleaner without it. */
	stroke?: boolean
	/** Per-series texture-tile fill URLs, aligned with `list`; a raw color or flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/** The plot rect, sizing the wipe clip an animated dashed line reveals under. */
	plot?: PlotRect
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

/** The draw of a solid stroke along its own length. @internal */
const LINE_HIDDEN = { pathLength: 0 }

/** @internal */
const LINE_SHOWN = { pathLength: 1 }

/**
 * The stroke un-draws along its own length — the draw-on reversed — when a data
 * change swaps the marks generation.
 *
 * @internal
 */
const LINE_EXIT = { pathLength: 0, transition: LINE_UNDRAW }

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
	 * Mount the marks at rest: the reader asks for reduced motion. The draw
	 * (`pathLength`) and the pop (`r`) are no transform, so the reduced-motion
	 * config of motion does not skip them.
	 */
	still: boolean
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
							initial={AREA_HIDDEN}
							animate={AREA_SHOWN}
							exit={AREA_EXIT}
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

			{rangeKeys(geometry.segments.length, `${label}-seg`).map((key, index) =>
				animated && !dashed ? (
					<m.path
						key={key}
						data-slot="chart-line"
						d={geometry.segments[index]}
						{...segmentProps(paint, false)}
						initial={still ? false : LINE_HIDDEN}
						animate={LINE_SHOWN}
						exit={LINE_EXIT}
						transition={LINE_DRAW}
					/>
				) : (
					<path
						key={key}
						data-slot="chart-line"
						d={geometry.segments[index]}
						clipPath={clip}
						{...segmentProps(paint, dashed)}
					/>
				),
			)}

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
						exit={POINT_EXIT}
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
 * body inside it. Only the group reads the emphasis. @internal
 */
function lineSeriesGroups(
	list: ChartLineSeries[],
	lit: (series: number) => boolean,
	fills: (string | undefined)[] | undefined,
	options: LineBodyOptions,
	clip?: string,
) {
	return list.map(({ index, label, paint, geometry, markers, dashed }, seriesIndex) => (
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
	))
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

/** The Framer Motion lines: each segment draws itself, washes and dots follow. @internal */
export function AnimatedChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
	plot,
}: ChartLineMarksProps) {
	// A dashed line can't ride the `pathLength` draw: motion reveals a stroke by
	// driving its `strokeDasharray`, which would overwrite the dash and settle
	// solid. So a dashed series holds its dash static and reveals under a clip
	// that wipes across the band axis — the reference rule's transform-reveal
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
						<m.rect
							x={plot.x}
							y={plot.y}
							width={plot.width}
							height={plot.height}
							style={{ originX: 0 }}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: 1 }}
							exit={{ scaleX: 0, transition: LINE_UNDRAW }}
							transition={LINE_DRAW}
						/>
					</clipPath>
				</defs>
			)}

			{lineSeriesGroups(
				list,
				lit,
				fills,
				{ fill, stroke, textureActive, animated: true, still },
				wipe ? `url(#${wipeId})` : undefined,
			)}
		</>
	)
}
