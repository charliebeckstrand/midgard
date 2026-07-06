'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { rangeKeys } from '../../utilities'
import {
	AREA_FILL_OPACITY,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
} from './chart-constants'
import { AREA_FADE, LINE_DRAW, POINT_POP } from './chart-motion'
import { textureClass, textureStyle } from './chart-pattern-defs'
import { fillClass, rawColor, type SeriesPaint, strokeClass } from './chart-series'
import type { LineSeriesGeometry } from './line-chart/line-chart-geometry'

/** One line series' render inputs. @internal */
export type ChartLineSeries = {
	label: string
	paint: SeriesPaint
	geometry: LineSeriesGeometry
	/** Mark every point, not only the isolated ones. */
	markers: boolean
	/** Legend emphasis elsewhere — this series fades back. */
	dimmed?: boolean
}

/** The series group's classes: the dim rides the group so motion's inline mark opacity still composes. @internal */
function seriesClass(dimmed: boolean | undefined): string {
	return cn('transition-opacity', dimmed && 'opacity-25')
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
}

/** The marker dot's classes: series fill, gaining a white surface stroke only where a dot crosses opaque marks. @internal */
function markerClass(paint: SeriesPaint, stroke: boolean): string {
	return cn(fillClass(paint), stroke && k.stroke)
}

/** The plain-SVG lines: the cheap default with no motion runtime work. @internal */
export function ChartLineMarks({
	list,
	fill,
	stroke = false,
	fills,
	textureActive = false,
}: ChartLineMarksProps) {
	return list.map(({ label, paint, geometry, markers, dimmed }, seriesIndex) => {
		const points = markers ? geometry.points : geometry.isolated

		const patternFill = fills?.[seriesIndex]

		return (
			<g key={label} data-slot="chart-line-series" className={seriesClass(dimmed)}>
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
						fill="none"
						stroke={rawColor(paint)}
						strokeWidth={LINE_STROKE_WIDTH}
						strokeLinecap="round"
						strokeLinejoin="round"
						className={cn(strokeClass(paint))}
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
}: ChartLineMarksProps) {
	return list.map(({ label, paint, geometry, markers, dimmed }, seriesIndex) => {
		const points = markers ? geometry.points : geometry.isolated

		const patternFill = fills?.[seriesIndex]

		return (
			<g key={label} data-slot="chart-line-series" className={seriesClass(dimmed)}>
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
							transition={{ ...AREA_FADE, delay: AREA_FADE.delay + delay }}
						/>
					))}

				{rangeKeys(geometry.segments.length, `${label}-seg`).map((key, index) => (
					<motion.path
						key={key}
						data-slot="chart-line"
						d={geometry.segments[index]}
						fill="none"
						stroke={rawColor(paint)}
						strokeWidth={LINE_STROKE_WIDTH}
						strokeLinecap="round"
						strokeLinejoin="round"
						className={cn(strokeClass(paint))}
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={{ ...LINE_DRAW, delay }}
					/>
				))}

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
						transition={{ ...POINT_POP, delay: POINT_POP.delay + delay }}
					/>
				))}
			</g>
		)
	})
}
