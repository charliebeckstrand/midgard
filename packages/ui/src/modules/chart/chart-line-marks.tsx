'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import {
	AREA_FADE,
	AREA_FILL_OPACITY,
	LINE_DRAW,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	POINT_POP,
} from './chart-constants'
import type { SeriesPaint } from './chart-series'
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
	/** Hold the draw until earlier marks (combo bars) have landed. */
	delay?: number
}

/** The marker dot's classes: series fill under a surface-colour ring. @internal */
function markerClass(paint: SeriesPaint): string {
	return cn(paint.fill, k.gap)
}

/** The plain-SVG lines: the cheap default with no motion runtime work. @internal */
export function ChartLineMarks({ list, fill }: ChartLineMarksProps) {
	return list.map(({ label, paint, geometry, markers, dimmed }) => (
		<g key={label} data-slot="chart-line-series" className={seriesClass(dimmed)}>
			{fill &&
				geometry.areas.map((area) => (
					<path
						key={area}
						data-slot="chart-area"
						d={area}
						stroke="none"
						fillOpacity={AREA_FILL_OPACITY}
						className={cn(paint.fill)}
					/>
				))}

			{geometry.segments.map((segment) => (
				<path
					key={segment}
					data-slot="chart-line"
					d={segment}
					fill="none"
					strokeWidth={LINE_STROKE_WIDTH}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn(paint.stroke)}
				/>
			))}

			{(markers ? geometry.points : geometry.isolated).map((point) => (
				<circle
					key={`${point.x}:${point.y}`}
					data-slot="chart-point"
					cx={point.x}
					cy={point.y}
					r={MARKER_RADIUS}
					strokeWidth={MARKER_RING_WIDTH}
					className={markerClass(paint)}
				/>
			))}
		</g>
	))
}

/** The Framer Motion lines: each segment draws itself, washes and dots follow. @internal */
export function AnimatedChartLineMarks({ list, fill, delay = 0 }: ChartLineMarksProps) {
	return list.map(({ label, paint, geometry, markers, dimmed }) => (
		<g key={label} data-slot="chart-line-series" className={seriesClass(dimmed)}>
			{fill &&
				geometry.areas.map((area) => (
					<motion.path
						key={area}
						data-slot="chart-area"
						d={area}
						stroke="none"
						fillOpacity={AREA_FILL_OPACITY}
						className={cn(paint.fill)}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ ...AREA_FADE, delay: AREA_FADE.delay + delay }}
					/>
				))}

			{geometry.segments.map((segment) => (
				<motion.path
					key={segment}
					data-slot="chart-line"
					d={segment}
					fill="none"
					strokeWidth={LINE_STROKE_WIDTH}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn(paint.stroke)}
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ ...LINE_DRAW, delay }}
				/>
			))}

			{(markers ? geometry.points : geometry.isolated).map((point) => (
				<motion.circle
					key={`${point.x}:${point.y}`}
					data-slot="chart-point"
					cx={point.x}
					cy={point.y}
					strokeWidth={MARKER_RING_WIDTH}
					className={markerClass(paint)}
					initial={{ r: 0, opacity: 0 }}
					animate={{ r: MARKER_RADIUS, opacity: 1 }}
					transition={{ ...POINT_POP, delay: POINT_POP.delay + delay }}
				/>
			))}
		</g>
	))
}
