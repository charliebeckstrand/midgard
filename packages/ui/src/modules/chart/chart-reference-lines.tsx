'use client'

import { motion } from 'motion/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { clamp } from '../../utilities'
import { REFERENCE_DASH, REFERENCE_HIT_WIDTH, REFERENCE_STROKE_WIDTH } from './chart-constants'
import type { PlotRect } from './chart-layout'
import type { ChartLegendReference } from './chart-legend'
import { REFERENCE_RISE, referenceRise } from './chart-motion'
import {
	bandExtent,
	type ChartOrientation,
	project,
	type Vec,
	valueExtent,
} from './chart-orientation'
import type { LinearScale } from './chart-scale'
import type { ChartReferenceLine } from './chart-schema'
import { formatChartValue } from './chart-series'
import { useChartEmphasis } from './context'

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
	/**
	 * Reveal each rule on mount by sliding it in along the value axis from the
	 * baseline to its value, in the direction the value points — the way the
	 * matching bar grows, up or down (vertical) and right or left (horizontal) —
	 * on the same beat as the marks. Honours `prefers-reduced-motion` through
	 * {@link ReducedMotion}.
	 * @defaultValue false
	 */
	animate?: boolean
}

/** Props for {@link ReferenceRule}. @internal */
type ReferenceRuleProps = {
	line: ChartReferenceLine
	/** The rule's position in the `reference` array — its identity to the keyboard emphasis. */
	index: number
	start: Vec
	end: Vec
	orientation: ChartOrientation
	format: (value: number) => string
	/** The mount slide-in transform from {@link referenceRise}, or `null` when the chart is static. */
	rise: ReturnType<typeof referenceRise> | null
}

/**
 * One reference rule: a dashed value-axis line under a transparent
 * {@link REFERENCE_HIT_WIDTH} hover target, wrapped in the design-system
 * {@link Tooltip} so pointing it floats a label-and-value readout. The rule
 * takes a named slot's stroke class or, for a raw hex / `oklch()` colour, an
 * inline stroke. The trigger sits inside the `aria-hidden` plot, so the readout
 * is a pointer enhancement; {@link ChartReferenceList} carries the parity.
 *
 * The keyboard reaches the rule the pointer can't hover: parking the roving
 * cursor here forces the same tooltip open, so focusing a rule reads exactly
 * like hovering it — the marks recede and the readout floats.
 *
 * @internal
 */
function ReferenceRule({ line, index, start, end, orientation, format, rise }: ReferenceRuleProps) {
	const { setReferenceActive, activeReference } = useChartEmphasis()

	const color = line.color ?? DEFAULT_REFERENCE_COLOR

	const slot = isSeriesSlot(color)

	const focused = activeReference === index

	const points = { x1: start.x, y1: start.y, x2: end.x, y2: end.y }

	// The drawn rule over its wide transparent hover target; the pair reveals as
	// one, so the hit line rises with the rule it stands in for.
	const rules = (
		<>
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
		</>
	)

	return (
		<Tooltip
			placement={orientation === 'vertical' ? 'top' : 'right'}
			delay={0}
			size="sm"
			forceOpen={focused}
		>
			<TooltipTrigger>
				{/* Pointing the rule recedes the marks to it (composes with the
				    tooltip's own hover handlers through the trigger). */}
				<g
					data-slot="chart-reference-line"
					data-focused={focused || undefined}
					onPointerEnter={() => setReferenceActive(true)}
					onPointerLeave={() => setReferenceActive(false)}
				>
					{rise ? (
						<motion.g {...rise} transition={REFERENCE_RISE}>
							{rules}
						</motion.g>
					) : (
						rules
					)}
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
 * the pointer where they sit. Under `animate` each rule rises along the value
 * axis from the baseline to its value — {@link referenceRise} — inside a
 * {@link ReducedMotion} that settles it at rest for a reduced-motion preference.
 * @internal
 */
export function ChartReferenceLines({
	plot,
	scale,
	reference,
	orientation = 'vertical',
	format,
	animate = false,
}: ChartReferenceLinesProps) {
	if (!scale || !reference || reference.length === 0) return null

	const [from, to] = bandExtent(orientation, plot)

	const [near, far] = valueExtent(orientation, plot)

	// The zero line each rule reveals from — the same baseline the bars grow
	// from — clamped onto the plot when zero sits off-domain. Revealing from here
	// points every rule the way its value does: up from zero for a value above
	// it, down for one below, transposed to right / left when horizontal, so a
	// rule animates like the bar that would reach it.
	const baseline = clamp(scale.map(0), Math.min(near, far), Math.max(near, far))

	const resolvedFormat = format ?? formatChartValue

	const group = (
		<g data-slot="chart-reference-lines">
			{reference.map((line, index) => {
				if (!Number.isFinite(line.value)) return null

				const at = scale.map(line.value)

				return (
					<ReferenceRule
						key={`${line.value}:${line.label ?? ''}`}
						line={line}
						index={index}
						start={project(orientation, at, from)}
						end={project(orientation, at, to)}
						orientation={orientation}
						format={resolvedFormat}
						rise={animate ? referenceRise(orientation, baseline - at) : null}
					/>
				)
			})}
		</g>
	)

	return animate ? <ReducedMotion>{group}</ReducedMotion> : group
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

/**
 * The legend entries for the reference lines: each finite rule's label — or its
 * value, unlabelled — keyed to a line swatch in the rule's colour, a palette
 * slot through its `text` class or a raw colour inline, resolved the same way
 * the rule itself paints. The chart legend renders these as static identity
 * chips beside the series switches when it shows; {@link ChartReferenceList}
 * still carries the assistive-tech parity.
 *
 * @internal
 */
export function referenceLegendItems(
	reference: ChartReferenceLine[] | undefined,
	format: (value: number) => string = formatChartValue,
): ChartLegendReference[] {
	return (reference ?? [])
		.filter((line) => Number.isFinite(line.value))
		.map((line) => {
			const color = line.color ?? DEFAULT_REFERENCE_COLOR

			const label = line.label ?? format(line.value)

			return isSeriesSlot(color)
				? { label, swatchClass: k.series[color].text.join(' ') }
				: { label, swatchClass: '', color }
		})
}
