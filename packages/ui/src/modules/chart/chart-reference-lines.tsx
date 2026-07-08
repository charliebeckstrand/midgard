'use client'

import { motion } from 'motion/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import { REFERENCE_DASH, REFERENCE_HIT_WIDTH, REFERENCE_STROKE_WIDTH } from './chart-constants'
import type { PlotRect } from './chart-layout'
import type { ChartLegendReference } from './chart-legend'
import { REFERENCE_RISE, referenceRise } from './chart-motion'
import { bandExtent, type ChartOrientation, project, type Vec } from './chart-orientation'
import type { LinearScale } from './chart-scale'
import type { ChartReferenceLine, ChartValueAxisSide } from './chart-schema'
import { formatChartValue, isSeriesSlot } from './chart-series'
import { useChartEmphasis, useChartTier } from './context'

/** Formats a reference value with its own axis's formatter. @internal */
type ReferenceFormat = (value: number, axis: ChartValueAxisSide) => string

/** The neutral de-emphasis slot a reference takes until coloured. @internal */
const DEFAULT_REFERENCE_COLOR = 'zinc' satisfies ChartSeriesColor

/** Props for {@link ChartReferenceLines}. @internal */
export type ChartReferenceLinesProps = {
	plot: PlotRect
	/** The resolved primary value scale, or `null` before a domain resolves. */
	scale: LinearScale | null
	/** The secondary scale, for rules bound to the right axis; a rule whose scale is `null` draws nothing. */
	rightScale?: LinearScale | null
	/** The reference lines to draw, or none; non-finite values are skipped. */
	reference: ChartReferenceLine[] | undefined
	/**
	 * Which way the value axis runs — vertical draws horizontal rules, horizontal
	 * draws vertical ones, mirroring {@link ChartGridLines}.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/** Formats each rule's tooltip value with its axis's formatter. @defaultValue locale integer / fraction */
	format?: ReferenceFormat
	/**
	 * Reveal each rule on mount by sliding it in along the value axis from the
	 * baseline to its value, in the direction the value points — the way the
	 * matching bar grows, up or down (vertical) and right or left (horizontal) —
	 * on the same beat as the marks. Honours `prefers-reduced-motion` through
	 * {@link ReducedMotion}.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Draw each rule's value as a standing label at its far end — the
	 * `labels.references` mode — in place of the hover tooltip. The rules then
	 * shed their pointer target and float no surface; the caller also drops their
	 * keyboard stop, since the label reads the value where pointing once did.
	 * @defaultValue false
	 */
	labels?: boolean
	/**
	 * Reference indexes toggled off through their legend chips — their rules draw
	 * nothing, holding their slot so a shown rule still keys its emphasis off its
	 * own `reference` index. Empty by default.
	 */
	hidden?: ReadonlySet<number>
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
	/** The plot box, for flipping a far-end label off the near edge. */
	plot: PlotRect
	/**
	 * Draw a standing value label at the rule's far end in place of the hover
	 * tooltip — the `labels.references` mode. The rule then sheds its wide hit
	 * target and floats no surface, and the caller drops its keyboard stop.
	 */
	labels: boolean
}

/** Gap from a rule to its far-end label, and the label's collision height for the near-edge flip. @internal */
const REFERENCE_LABEL_OFFSET = 8
const REFERENCE_LABEL_HEIGHT = 13
const REFERENCE_LABEL_HALF = REFERENCE_LABEL_HEIGHT / 2

/** The standing reference label's ink: small, semibold, tabular, in the rule's colour. @internal */
const REFERENCE_LABEL_INK = 'text-xs font-semibold tabular-nums'

/** A resolved reference-label anchor: where its text sits and how it aligns. @internal */
type ReferenceLabelAnchor = { x: number; y: number; textAnchor: 'end' | 'middle' }

/**
 * Where a rule's standing label sits: at the far end of the rule, clear of the
 * dashes. A vertical rule labels above its far (right) end, flipping below when
 * the value crowds the top edge; a horizontal rule labels at the top of its far
 * end. @internal
 */
function referenceLabelAnchor(
	orientation: ChartOrientation,
	end: Vec,
	plot: PlotRect,
): ReferenceLabelAnchor {
	if (orientation === 'vertical') {
		const above = end.y - REFERENCE_LABEL_OFFSET - REFERENCE_LABEL_HEIGHT >= plot.y

		return {
			x: end.x,
			y: above
				? end.y - REFERENCE_LABEL_OFFSET - REFERENCE_LABEL_HALF
				: end.y + REFERENCE_LABEL_OFFSET + REFERENCE_LABEL_HALF,
			textAnchor: 'end',
		}
	}

	return {
		x: end.x,
		y: plot.y + REFERENCE_LABEL_OFFSET + REFERENCE_LABEL_HALF,
		textAnchor: 'middle',
	}
}

/** The two endpoints of a rule's drawn line, in `viewBox` user units. @internal */
type RulePoints = { x1: number; y1: number; x2: number; y2: number }

/**
 * The dashed value-axis rule itself, shared by the hover and labelled
 * renderings: a named slot's stroke class, or a raw hex / `oklch()` colour
 * inline. Never takes the pointer — the hover rendering lays its own transparent
 * hit line over this. @internal
 */
function ReferenceRuleStroke({ line, points }: { line: ChartReferenceLine; points: RulePoints }) {
	const color = line.color ?? DEFAULT_REFERENCE_COLOR

	const slot = isSeriesSlot(color)

	return (
		<line
			{...points}
			strokeWidth={REFERENCE_STROKE_WIDTH}
			strokeDasharray={line.dashed === false ? undefined : REFERENCE_DASH}
			className={slot ? cn(k.series[color].stroke) : undefined}
			style={slot ? undefined : { stroke: color }}
			pointerEvents="none"
		/>
	)
}

/**
 * The labelled rendering: the rule under a standing value label at its far end,
 * inked to match — a slot through its fill class, a raw colour inline — with the
 * rule's own label as a prefix where it has one. It floats no tooltip and lays no
 * hit target: the label reads what pointing would, so the rule drops the hover
 * path (and the caller drops its keyboard stop). The label rides the mount rise,
 * so rule and label reveal as one.
 *
 * @internal
 */
function LabelledReferenceRule({
	line,
	index,
	start,
	end,
	orientation,
	format,
	rise,
	plot,
}: ReferenceRuleProps) {
	const { emphasizedReference } = useChartEmphasis()

	const color = line.color ?? DEFAULT_REFERENCE_COLOR

	const slot = isSeriesSlot(color)

	const anchor = referenceLabelAnchor(orientation, end, plot)

	const valueText = format(line.value)

	// A standing rule has no hover target of its own, but a legend chip's emphasis
	// still recedes the siblings of the rule it names, label and all.
	const receded = emphasizedReference !== null && emphasizedReference !== index

	const body = (
		<>
			<ReferenceRuleStroke
				line={line}
				points={{ x1: start.x, y1: start.y, x2: end.x, y2: end.y }}
			/>

			<text
				data-slot="chart-reference-label"
				x={anchor.x}
				y={anchor.y}
				textAnchor={anchor.textAnchor}
				dominantBaseline="central"
				className={cn(REFERENCE_LABEL_INK, slot ? cn(k.series[color].fill) : undefined)}
				style={slot ? undefined : { fill: color }}
			>
				{line.label ? line.label : valueText}
			</text>
		</>
	)

	return (
		<g
			data-slot="chart-reference-line"
			pointerEvents="none"
			className={cn('transition-opacity', receded && 'opacity-25')}
		>
			{rise ? (
				<motion.g {...rise} transition={REFERENCE_RISE}>
					{body}
				</motion.g>
			) : (
				body
			)}
		</g>
	)
}

/**
 * The hover rendering: the dashed rule under a transparent
 * {@link REFERENCE_HIT_WIDTH} hit target, wrapped in the design-system
 * {@link Tooltip} so pointing it floats a label-and-value readout. The trigger
 * sits inside the `aria-hidden` plot, so the readout is a pointer enhancement;
 * {@link ChartReferenceList} carries the parity.
 *
 * The keyboard reaches the rule the pointer can't hover: parking the roving
 * cursor here forces the same tooltip open, so focusing a rule reads exactly
 * like hovering it — the marks recede and the readout floats.
 *
 * @internal
 */
function HoverReferenceRule({
	line,
	index,
	start,
	end,
	orientation,
	format,
	rise,
}: ReferenceRuleProps) {
	const { setReferenceActive, activeReference, emphasizedReference } = useChartEmphasis()

	const color = line.color ?? DEFAULT_REFERENCE_COLOR

	const slot = isSeriesSlot(color)

	const points: RulePoints = { x1: start.x, y1: start.y, x2: end.x, y2: end.y }

	const focused = activeReference === index

	// Another rule holds the emphasis: this one recedes to it, the way the data
	// marks do, so pointing one rule reads it clear of the rest.
	const receded = emphasizedReference !== null && emphasizedReference !== index

	// The drawn rule over its wide transparent hover target; the pair reveals as
	// one, so the hit line rises with the rule it stands in for.
	const rules = (
		<>
			<ReferenceRuleStroke line={line} points={points} />

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
				{/* Pointing the rule recedes the marks and the sibling rules to it
				    (composes with the tooltip's own hover handlers through the trigger). */}
				<g
					data-slot="chart-reference-line"
					data-focused={focused || undefined}
					className={cn('transition-opacity', receded && 'opacity-25')}
					onPointerEnter={() => setReferenceActive(index)}
					onPointerLeave={() => setReferenceActive(null)}
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
 * The spark rendering: the dashed rule alone, pointer-inert — no hit target,
 * no tooltip, no standing label, no emphasis. A sparkline is read-only bare
 * marks, so a rule keeps only its ink; it still rides the mount rise, since
 * spark strips interactivity, not the drawing.
 *
 * @internal
 */
function SparkReferenceRule({ line, start, end, rise }: ReferenceRuleProps) {
	const body = (
		<ReferenceRuleStroke line={line} points={{ x1: start.x, y1: start.y, x2: end.x, y2: end.y }} />
	)

	return (
		<g data-slot="chart-reference-line" pointerEvents="none">
			{rise ? (
				<motion.g {...rise} transition={REFERENCE_RISE}>
					{body}
				</motion.g>
			) : (
				body
			)}
		</g>
	)
}

/**
 * One reference rule, in one of three renderings: the bare {@link
 * SparkReferenceRule} at the spark tier (read through {@link ChartTierContext},
 * so the frame decides and no chart gates it), the standing {@link
 * LabelledReferenceRule} under `labels`, else the interactive {@link
 * HoverReferenceRule}. All draw the same dashed rule; they differ only in
 * whether the value reads from nothing, a fixed label, or a hover-and-keyboard
 * tooltip.
 *
 * @internal
 */
function ReferenceRule(props: ReferenceRuleProps) {
	const spark = useChartTier() === 'spark'

	if (spark) return <SparkReferenceRule {...props} />

	return props.labels ? <LabelledReferenceRule {...props} /> : <HoverReferenceRule {...props} />
}

/**
 * Reference lines at fixed values, drawn across the band axis — the same
 * value→project→draw path as {@link ChartGridLines}, but on a raw domain value
 * and over the marks instead of under them, so a target or threshold reads
 * against the data rather than hiding behind it. Each rule floats its value and
 * label from a {@link Tooltip} on hover, or — under `labels` — carries them in a
 * standing label at its far end.
 *
 * @remarks Self-gating: a chart mounts it unconditionally and it draws nothing
 * until both a scale and reference lines exist, so the gate lives here instead
 * of at every call site. Render it last, over the hit area, so the rules win
 * the pointer where they sit. Under `animate` each rule rises along the value
 * axis from the baseline to its value — {@link referenceRise} — inside a
 * {@link ReducedMotion} that settles it at rest for a reduced-motion preference.
 * Under `labels` each rule carries a standing value label at its far end and
 * drops the hover tooltip — the `labels.references` mode. At the spark tier —
 * read through {@link ChartTierContext}, over either mode — each rule sheds its
 * hit target, tooltip, and label to the bare dashed stroke: a sparkline is
 * read-only, so the rules keep their ink and give up the pointer.
 * @internal
 */
export function ChartReferenceLines({
	plot,
	scale,
	rightScale = null,
	reference,
	orientation = 'vertical',
	format,
	animate = false,
	labels = false,
	hidden,
}: ChartReferenceLinesProps) {
	if ((!scale && !rightScale) || !reference || reference.length === 0) return null

	const [from, to] = bandExtent(orientation, plot)

	// The zero line each rule reveals from — the same baseline the bars grow from,
	// on the rule's own axis. `map` already clamps its output into the scale's
	// range (the value extent), so zero lands on the plot even off-domain
	// without a second clamp. Revealing from here points every rule the way its
	// value does: up from zero for a value above it, down for one below, transposed
	// to right / left when horizontal, so a rule animates like the bar that would
	// reach it.
	const baselineOf = (ruleScale: LinearScale) => ruleScale.map(0)

	const resolvedFormat = format ?? formatChartValue

	const group = (
		<g data-slot="chart-reference-lines">
			{reference.map((line, index) => {
				const axis = line.axis ?? 'left'

				const ruleScale = axis === 'right' ? rightScale : scale

				// A rule toggled off through its chip draws nothing but keeps its slot, so
				// a shown rule's emphasis still keys off its own `reference` index.
				if (!ruleScale || !Number.isFinite(line.value) || hidden?.has(index)) return null

				const at = ruleScale.map(line.value)

				return (
					<ReferenceRule
						key={`${line.value}:${line.label ?? ''}`}
						line={line}
						index={index}
						start={project(orientation, at, from)}
						end={project(orientation, at, to)}
						orientation={orientation}
						format={(value) => resolvedFormat(value, axis)}
						rise={animate ? referenceRise(orientation, baselineOf(ruleScale) - at) : null}
						plot={plot}
						labels={labels}
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
	format?: ReferenceFormat
	/**
	 * Reference indexes toggled off through their legend chips — dropped from the
	 * parity so it reads the rules the plot still draws, the way the data table
	 * follows the visible series. Empty by default.
	 */
	hidden?: ReadonlySet<number>
}

/**
 * The reference lines' visually-hidden parity: each rule's label and value in
 * plain markup outside the `role="img"` region, so assistive tech reads them
 * without the pointer — the hover tooltip stays an enhancement, the same
 * contract as the data table. A rule toggled off through its chip drops out, so
 * the parity tracks what the plot draws.
 *
 * @internal
 */
export function ChartReferenceList({ reference, format, hidden }: ChartReferenceListProps) {
	const lines =
		reference?.filter((line, index) => Number.isFinite(line.value) && !hidden?.has(index)) ?? []

	if (lines.length === 0) return null

	const resolvedFormat = format ?? formatChartValue

	const value = (line: ChartReferenceLine) => resolvedFormat(line.value, line.axis ?? 'left')

	return (
		<ul data-slot="chart-reference-list" className="sr-only">
			{lines.map((line) => (
				<li key={`${line.value}:${line.label ?? ''}`}>
					{line.label ? `${line.label}: ${value(line)}` : value(line)}
				</li>
			))}
		</ul>
	)
}

/**
 * The legend entries for the reference lines: each finite rule's label — or its
 * value, unlabelled — keyed to a line swatch in the rule's colour, a palette
 * slot through its `text` class or a raw colour inline, and dashed to match the
 * rule unless it is drawn solid — all resolved the same way the rule itself
 * paints. The chart legend renders these as switches beside the series switches
 * when it shows, each toggling its rule off; {@link ChartReferenceList} still
 * carries the assistive-tech parity.
 *
 * @internal
 */
export function referenceLegendItems(
	reference: ChartReferenceLine[] | undefined,
	format: ReferenceFormat = formatChartValue,
): ChartLegendReference[] {
	return (reference ?? [])
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => Number.isFinite(line.value))
		.map(({ line, index }) => {
			const color = line.color ?? DEFAULT_REFERENCE_COLOR

			const label = line.label ?? format(line.value, line.axis ?? 'left')

			// Mirror the rule: dashed unless it is explicitly drawn solid.
			const dashed = line.dashed !== false

			// Carry the rule's own array index — the plot rules key their emphasis off
			// it, and a non-finite rule dropped from the chips leaves a gap the plot
			// keeps, so the chip must name the index rather than its own position.
			return isSeriesSlot(color)
				? { index, label, swatchClass: k.series[color].text.join(' '), dashed }
				: { index, label, swatchClass: '', color, dashed }
		})
}
