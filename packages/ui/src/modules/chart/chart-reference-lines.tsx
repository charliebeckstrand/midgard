'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { REFERENCE_DASH, REFERENCE_HIT_WIDTH, REFERENCE_STROKE_WIDTH } from './chart-constants'
import type { PlotRect } from './chart-layout'
import { bandExtent, type ChartOrientation, project, type Vec } from './chart-orientation'
import type { LinearScale } from './chart-scale'
import type { ChartReferenceLine } from './chart-schema'
import { formatChartValue } from './chart-series'

/** The neutral de-emphasis slot a reference takes until coloured. @internal */
const DEFAULT_REFERENCE_COLOR = 'zinc' satisfies ChartSeriesColor

/** Whether a colour names a palette slot (class-based) rather than a raw CSS colour (inline). @internal */
function isSeriesSlot(color: string): color is ChartSeriesColor {
	return color in k.series
}

/** Props for {@link ChartReferenceLines}. @internal */
export type ChartReferenceLinesProps = {
	plot: PlotRect
	/** The resolved value scale, or `null` before a domain resolves — nothing draws then. */
	scale: LinearScale | null
	/** The reference lines to draw, or none; non-finite values are skipped. */
	reference: ChartReferenceLine[] | undefined
	/**
	 * Which way the value axis runs — vertical draws horizontal rules, horizontal
	 * draws vertical ones, mirroring {@link ChartGridLines}.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/** Formats the value shown in the hover tooltip. @defaultValue locale integer / fraction */
	format?: (value: number) => string
}

/** Props for {@link ReferenceRule}. @internal */
type ReferenceRuleProps = {
	line: ChartReferenceLine
	start: Vec
	end: Vec
	orientation: ChartOrientation
	format: (value: number) => string
}

/**
 * One reference rule: a dashed value-axis line under a transparent
 * {@link REFERENCE_HIT_WIDTH} hover target, wrapped in the design-system
 * {@link Tooltip} so pointing it floats a label-and-value readout. The rule
 * takes a named slot's stroke class or, for a raw hex / `oklch()` colour, an
 * inline stroke. The trigger sits inside the `aria-hidden` plot, so the readout
 * is a pointer enhancement; {@link ChartReferenceList} carries the parity.
 *
 * @internal
 */
function ReferenceRule({ line, start, end, orientation, format }: ReferenceRuleProps) {
	const color = line.color ?? DEFAULT_REFERENCE_COLOR

	const slot = isSeriesSlot(color)

	const points = { x1: start.x, y1: start.y, x2: end.x, y2: end.y }

	return (
		<Tooltip placement={orientation === 'vertical' ? 'top' : 'right'} delay={0} size="sm">
			<TooltipTrigger>
				<g data-slot="chart-reference-line">
					<line
						{...points}
						strokeWidth={REFERENCE_STROKE_WIDTH}
						strokeDasharray={line.dashed === false ? undefined : REFERENCE_DASH}
						className={slot ? cn(k.series[color].stroke) : undefined}
						style={slot ? undefined : { stroke: color }}
						pointerEvents="none"
					/>

					<line
						{...points}
						stroke="transparent"
						strokeWidth={REFERENCE_HIT_WIDTH}
						pointerEvents="stroke"
					/>
				</g>
			</TooltipTrigger>

			<TooltipContent size="sm">
				<div aria-hidden="true" className="flex items-center gap-1.5 whitespace-nowrap">
					<span
						data-slot="chart-reference-swatch"
						className={cn(
							'inline-block h-[2px] w-3 rounded-full',
							slot && cn(k.series[color].text, 'bg-current'),
						)}
						style={slot ? undefined : { backgroundColor: color }}
					/>

					<span className={cn(k.value)}>{format(line.value)}</span>

					{line.label && <span className={cn(k.label)}>{line.label}</span>}
				</div>
			</TooltipContent>
		</Tooltip>
	)
}

/**
 * Reference lines at fixed values, drawn across the band axis — the same
 * value→project→draw path as {@link ChartGridLines}, but on a raw domain value
 * and over the marks instead of under them, so a target or threshold reads
 * against the data rather than hiding behind it. Each rule is a hover target
 * floating a {@link Tooltip} with its value and label.
 *
 * @remarks Self-gating: a chart mounts it unconditionally and it draws nothing
 * until both a scale and reference lines exist, so the gate lives here instead
 * of at every call site. Render it last, over the hit area, so the rules win
 * the pointer where they sit.
 * @internal
 */
export function ChartReferenceLines({
	plot,
	scale,
	reference,
	orientation = 'vertical',
	format,
}: ChartReferenceLinesProps) {
	if (!scale || !reference || reference.length === 0) return null

	const [from, to] = bandExtent(orientation, plot)

	const resolvedFormat = format ?? formatChartValue

	return (
		<g data-slot="chart-reference-lines">
			{reference.map((line) => {
				if (!Number.isFinite(line.value)) return null

				const at = scale.map(line.value)

				return (
					<ReferenceRule
						key={`${line.value}:${line.label ?? ''}`}
						line={line}
						start={project(orientation, at, from)}
						end={project(orientation, at, to)}
						orientation={orientation}
						format={resolvedFormat}
					/>
				)
			})}
		</g>
	)
}

/** Props for {@link ChartReferenceList}. @internal */
export type ChartReferenceListProps = {
	reference: ChartReferenceLine[] | undefined
	format?: (value: number) => string
}

/**
 * The reference lines' visually-hidden parity: each rule's label and value in
 * plain markup outside the `role="img"` region, so assistive tech reads them
 * without the pointer — the hover tooltip stays an enhancement, the same
 * contract as the data table.
 *
 * @internal
 */
export function ChartReferenceList({ reference, format }: ChartReferenceListProps) {
	const lines = reference?.filter((line) => Number.isFinite(line.value)) ?? []

	if (lines.length === 0) return null

	const resolvedFormat = format ?? formatChartValue

	return (
		<ul data-slot="chart-reference-list" className="sr-only">
			{lines.map((line) => (
				<li key={`${line.value}:${line.label ?? ''}`}>
					{line.label ? `${line.label}: ${resolvedFormat(line.value)}` : resolvedFormat(line.value)}
				</li>
			))}
		</ul>
	)
}
