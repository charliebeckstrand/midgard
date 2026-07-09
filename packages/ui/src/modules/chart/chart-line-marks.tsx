'use client'

import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { rangeKeys } from '../../utilities'
import {
	AREA_FILL_OPACITY,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	REFERENCE_DASH,
} from './chart-constants'
import type { PlotRect } from './chart-layout'
import {
	AREA_FADE,
	AREA_UNFADE,
	LINE_DRAW,
	LINE_UNDRAW,
	POINT_POP,
	POINT_UNPOP,
} from './chart-motion'
import { textureClass, textureStyle } from './chart-pattern-defs'
import {
	fillClass,
	rawColor,
	type SeriesPaint,
	seriesGroupClass,
	strokeClass,
} from './chart-series'
import { useChartMarkEmphasis } from './context'
import type { LineSeriesGeometry } from './line-chart/line-chart-geometry'

/** One line series' render inputs. @internal */
export type ChartLineSeries = {
	/** The series' own index in the caller's list — the React key, stable across toggles and unique where two series share a label. */
	index: number
	label: string
	paint: SeriesPaint
	geometry: LineSeriesGeometry
	/** Mark every point, not only the isolated ones. */
	markers: boolean
	/** Dash the connecting stroke — the reference-line dash — leaving fill and markers untouched. */
	dashed?: boolean
}

/** Shared shape for the static and animated line renderers. @internal */
export type ChartLineMarksProps = {
	list: ChartLineSeries[]
	/** Render the area washes under the lines. */
	fill: boolean
	/** Stroke the markers with a surface outline — set only where dots cross opaque marks (the combo bars); soft fills read cleaner without it. */
	stroke?: boolean
	/** Per-series texture-tile fill URLs, aligned with `list`; a raw colour or flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/** Hold the draw until earlier marks (combo bars) have landed. */
	delay?: number
	/** The plot rect, sizing the wipe clip an animated dashed line reveals under. */
	plot?: PlotRect
}

/** The marker dot's classes: series fill, gaining a white surface stroke only where a dot crosses opaque marks. @internal */
function markerClass(paint: SeriesPaint, stroke: boolean): string {
	return cn(fillClass(paint), stroke && k.stroke)
}

/** A line segment's shared presentation, dashed for a dashed series. @internal */
function segmentProps(paint: SeriesPaint, dashed: boolean | undefined) {
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

/** The plain-SVG lines: the cheap default with no motion runtime work. @internal */
export function ChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
}: ChartLineMarksProps) {
	const { lit } = useChartMarkEmphasis()

	return list.map(({ index, label, paint, geometry, markers, dashed }, seriesIndex) => {
		const points = markers ? geometry.points : geometry.isolated

		const patternFill = fills?.[seriesIndex]

		return (
			<g key={index} data-slot="chart-line-series" className={seriesGroupClass(!lit(index))}>
				{fill &&
					rangeKeys(geometry.areas.length, `${label}-area`).map((key, index) => (
						<path
							key={key}
							data-slot="chart-area"
							d={geometry.areas[index]}
							stroke="none"
							fill={rawColor(paint)}
							fillOpacity={AREA_FILL_OPACITY}
							style={textureStyle(patternFill)}
							className={cn(fillClass(paint), textureClass(textureActive, patternFill))}
						/>
					))}

				{rangeKeys(geometry.segments.length, `${label}-seg`).map((key, index) => (
					<path
						key={key}
						data-slot="chart-line"
						d={geometry.segments[index]}
						{...segmentProps(paint, dashed)}
					/>
				))}

				{rangeKeys(points.length, `${label}-pt`).map((key, index) => (
					<circle
						key={key}
						data-slot="chart-point"
						cx={points[index]?.x}
						cy={points[index]?.y}
						r={MARKER_RADIUS}
						fill={rawColor(paint)}
						strokeWidth={MARKER_RING_WIDTH}
						className={markerClass(paint, stroke)}
					/>
				))}
			</g>
		)
	})
}

/** The Framer Motion lines: each segment draws itself, washes and dots follow. @internal */
export function AnimatedChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
	delay = 0,
	plot,
}: ChartLineMarksProps) {
	// A dashed line can't ride the `pathLength` draw: motion reveals a stroke by
	// driving its `strokeDasharray`, which would overwrite the dash and settle
	// solid. So a dashed series holds its dash static and reveals under a clip
	// that wipes across the band axis — the reference rule's transform-reveal
	// trick, one draw-on beat with the solid lines' stroke.
	const wipeId = `chart-line-wipe-${useId().replace(/:/g, '')}`

	const wipe = plot && list.some((series) => series.dashed)

	const { lit } = useChartMarkEmphasis()

	return (
		<>
			{wipe && (
				<defs>
					<clipPath id={wipeId} data-slot="chart-line-wipe">
						<motion.rect
							x={plot.x}
							y={plot.y}
							width={plot.width}
							height={plot.height}
							style={{ originX: 0 }}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: 1 }}
							exit={{ scaleX: 0, transition: LINE_UNDRAW }}
							transition={{ ...LINE_DRAW, delay }}
						/>
					</clipPath>
				</defs>
			)}

			{list.map(({ index, label, paint, geometry, markers, dashed }, seriesIndex) => {
				const points = markers ? geometry.points : geometry.isolated

				const patternFill = fills?.[seriesIndex]

				const clip = dashed && wipe ? `url(#${wipeId})` : undefined

				return (
					<g key={index} data-slot="chart-line-series" className={seriesGroupClass(!lit(index))}>
						{fill &&
							rangeKeys(geometry.areas.length, `${label}-area`).map((key, index) => (
								<motion.path
									key={key}
									data-slot="chart-area"
									d={geometry.areas[index]}
									stroke="none"
									fill={rawColor(paint)}
									fillOpacity={AREA_FILL_OPACITY}
									style={textureStyle(patternFill)}
									className={cn(fillClass(paint), textureClass(textureActive, patternFill))}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0, transition: AREA_UNFADE }}
									transition={{ ...AREA_FADE, delay: AREA_FADE.delay + delay }}
								/>
							))}

						{rangeKeys(geometry.segments.length, `${label}-seg`).map((key, index) =>
							// The dash reveals under the wipe clip, holding its pattern; a solid
							// stroke draws itself along its own length.
							dashed ? (
								<path
									key={key}
									data-slot="chart-line"
									d={geometry.segments[index]}
									clipPath={clip}
									{...segmentProps(paint, true)}
								/>
							) : (
								<motion.path
									key={key}
									data-slot="chart-line"
									d={geometry.segments[index]}
									{...segmentProps(paint, false)}
									initial={{ pathLength: 0 }}
									animate={{ pathLength: 1 }}
									// The stroke un-draws along its own length — the draw-on reversed —
									// when a data change swaps the marks generation.
									exit={{ pathLength: 0, transition: LINE_UNDRAW }}
									transition={{ ...LINE_DRAW, delay }}
								/>
							),
						)}

						{rangeKeys(points.length, `${label}-pt`).map((key, index) => (
							<motion.circle
								key={key}
								data-slot="chart-point"
								cx={points[index]?.x}
								cy={points[index]?.y}
								fill={rawColor(paint)}
								strokeWidth={MARKER_RING_WIDTH}
								className={markerClass(paint, stroke)}
								initial={{ r: 0, opacity: 0 }}
								animate={{ r: MARKER_RADIUS, opacity: 1 }}
								exit={{ r: 0, opacity: 0, transition: POINT_UNPOP }}
								transition={{ ...POINT_POP, delay: POINT_POP.delay + delay }}
							/>
						))}
					</g>
				)
			})}
		</>
	)
}
