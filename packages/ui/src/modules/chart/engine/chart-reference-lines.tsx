'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn, dataAttr } from '../../../core'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../recipes/kata/chart'
import {
	type ChartPaint,
	fillClass,
	rawColor,
	resolvePaint,
	strokeClass,
	textClass,
} from './chart-color/paint'
import { REFERENCE_DASH, REFERENCE_HIT_WIDTH, REFERENCE_STROKE_WIDTH } from './chart-constants'
import { LABEL_HEIGHT, LABEL_OFFSET, labelBesideY } from './chart-geometry/label'
import { REFERENCE_RISE, referenceRise } from './chart-motion'
import { type ChartOrientation, type PlotRect, valueRule } from './chart-orientation'
import {
	type ChartReferenceLine,
	DEFAULT_REFERENCE_COLOR,
	type ReferenceFormat,
	referenceText,
	ruleKeys,
} from './chart-reference'
import type { LinearScale } from './chart-scale'
import { seriesGroupClass } from './chart-series'
import { useChartEmphasis, useChartReferencePoint, useChartTier } from './context'

/**
 * The part of a cartesian chart that its reference rules read: the plot, the
 * value scales, the facing, the formatter, and the position and the legend state
 * of each rule.
 *
 * @internal
 */
export type ChartReferenceFrame = {
	plot: PlotRect
	/** The resolved primary value scale, or `null` before a domain resolves. */
	yScale: LinearScale | null
	/** The secondary scale, for rules bound to `y2`. */
	y2Scale: LinearScale | null
	/**
	 * Which way the value axis runs. A vertical chart draws horizontal rules, and a
	 * horizontal chart draws vertical ones, as {@link ChartGridLines} does.
	 */
	orientation: ChartOrientation
	/** Formats each rule's value with the formatter of its axis. */
	formatAxisValue: ReferenceFormat
	/**
	 * The value-axis position of each rule, aligned with the `reference` prop.
	 * `null` where the rule draws nothing: a non-finite value, a scale that did not
	 * resolve, or a rule toggled off through its legend chip.
	 */
	referencePositions: (number | null)[]
}

/** Props for {@link ChartReferenceLines}. @internal */
export type ChartReferenceLinesProps = {
	/** The chart that the rules annotate. */
	chart: ChartReferenceFrame
	/** The reference lines to draw, or none. */
	reference: ChartReferenceLine[] | undefined
	/**
	 * Reveal each rule on mount by sliding it in along the value axis, from the
	 * baseline to its value. It slides in the direction the value points, on the
	 * same beat as the marks. That is the way the matching bar grows: up or down
	 * (vertical), and right or left (horizontal). Honors `prefers-reduced-motion`
	 * through {@link ReducedMotion}.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Draw a standing label at each rule's far end — the `labels.references`
	 * mode — in place of the hover tooltip. The label shows the rule's own label
	 * when it has one, else the rule's value. The rules then shed their pointer
	 * target and float no surface. The caller also drops their keyboard stop
	 * ({@link referenceStops}), since the label reads the value where pointing
	 * once did.
	 * @defaultValue false
	 */
	labels?: boolean
}

/**
 * The keyboard stops of the reference rules, or none when `labels.references`
 * draws their values beside them. A labeled rule reads its value without the
 * rove, so it leaves the value-axis roving as it leaves the hover tooltip.
 *
 * @internal
 */
export function referenceStops(
	labels: boolean | undefined,
	positions: (number | null)[],
): (number | null)[] | undefined {
	return labels ? undefined : positions
}

/** Props for {@link ReferenceRule}. @internal */
type ReferenceRuleProps = {
	line: ChartReferenceLine
	/** The rule's position in the `reference` array — its identity to the keyboard emphasis. */
	index: number
	/** The rule's paint, resolved once for the stroke, the label, and the tooltip swatch. */
	paint: ChartPaint
	/** The two endpoints of the drawn rule. */
	points: RulePoints
	orientation: ChartOrientation
	format: (value: number) => string
	/** The mount slide-in transform from {@link referenceRise}, or `null` when the chart is static. */
	rise: ReturnType<typeof referenceRise> | null
	/** The plot box, for flipping a far-end label off the near edge. */
	plot: PlotRect
	/**
	 * Draw a standing label at the rule's far end in place of the hover
	 * tooltip — the `labels.references` mode. The rule then sheds its wide hit
	 * target and floats no surface, and the caller drops its keyboard stop.
	 */
	labels: boolean
}

/** A resolved reference-label anchor: where its text sits and how it aligns. @internal */
type ReferenceLabelAnchor = { x: number; y: number; textAnchor: 'end' | 'middle' }

/**
 * Where a rule's standing label sits, clear of the dashes. In a vertical chart,
 * the label sits above the rule's right end, and flips below where the value
 * crowds the top edge: the flip that the value labels use. In a horizontal
 * chart, the label hangs below the top of the rule. @internal
 */
function referenceLabelAnchor(
	orientation: ChartOrientation,
	points: RulePoints,
	plot: PlotRect,
): ReferenceLabelAnchor {
	if (orientation === 'vertical') {
		return { x: points.x2, y: labelBesideY(points.y2, plot, true), textAnchor: 'end' }
	}

	return { x: points.x2, y: plot.y + LABEL_OFFSET + LABEL_HEIGHT / 2, textAnchor: 'middle' }
}

/** The two endpoints of a rule's drawn line, in `viewBox` user units. @internal */
type RulePoints = { x1: number; y1: number; x2: number; y2: number }

/**
 * The dashed value-axis rule itself, shared by the three renderings: a named
 * slot's stroke class, or a raw hex / `oklch()` color inline. Never takes the
 * pointer — the hover rendering lays its own transparent hit line over this.
 * @internal
 */
function ReferenceRuleStroke({
	line,
	paint,
	points,
}: Pick<ReferenceRuleProps, 'line' | 'paint' | 'points'>) {
	const color = rawColor(paint)

	return (
		<line
			{...points}
			strokeWidth={REFERENCE_STROKE_WIDTH}
			strokeDasharray={line.dashed === false ? undefined : REFERENCE_DASH}
			className={strokeClass(paint)}
			style={color ? { stroke: color } : undefined}
			pointerEvents="none"
		/>
	)
}

/**
 * The mount slide-in of a rule: its content in a `m.g` that rises from the
 * baseline, or the content as is on a static chart. The rule, its hit line, and
 * its label ride it as one. @internal
 */
function RuleRise({ rise, children }: { rise: ReferenceRuleProps['rise']; children: ReactNode }) {
	return rise ? (
		<m.g {...rise} transition={REFERENCE_RISE}>
			{children}
		</m.g>
	) : (
		children
	)
}

/**
 * The labeled rendering: the rule under a standing label at its far end,
 * inked to match. That is a slot through its fill class, or a raw color inline.
 * The label shows the rule's own label when it has one, else the rule's value.
 * It floats no tooltip and lays no hit target. The label reads what pointing
 * would, so the rule drops the hover path (and the caller drops its keyboard
 * stop). The label rides the mount rise, so rule and label reveal as one.
 *
 * @internal
 */
function LabeledReferenceRule({
	line,
	index,
	paint,
	points,
	orientation,
	format,
	rise,
	plot,
}: ReferenceRuleProps) {
	const { emphasizedReference } = useChartEmphasis()

	const anchor = referenceLabelAnchor(orientation, points, plot)

	const color = rawColor(paint)

	// A standing rule has no hover target of its own, but a legend chip's emphasis
	// still recedes the siblings of the rule it names, label and all.
	const receded = emphasizedReference !== null && emphasizedReference !== index

	return (
		<g data-slot="chart-reference-line" pointerEvents="none" className={seriesGroupClass(receded)}>
			<RuleRise rise={rise}>
				<ReferenceRuleStroke line={line} paint={paint} points={points} />

				<text
					data-slot="chart-reference-label"
					x={anchor.x}
					y={anchor.y}
					textAnchor={anchor.textAnchor}
					dominantBaseline="central"
					className={cn(k.mark.label, fillClass(paint))}
					style={color ? { fill: color } : undefined}
				>
					{line.label || format(line.value)}
				</text>
			</RuleRise>
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
 * The keyboard reaches the rule the pointer can't hover. Parking the roving
 * cursor here forces the same tooltip open, so focusing a rule reads exactly
 * like hovering it. The marks recede, and the readout floats.
 *
 * @internal
 */
function HoverReferenceRule({
	line,
	index,
	paint,
	points,
	orientation,
	format,
	rise,
}: ReferenceRuleProps) {
	const { activeReference, emphasizedReference } = useChartEmphasis()

	const setReferenceActive = useChartReferencePoint()

	// Whether the pointer rests on this rule. A rule that unmounts under the
	// pointer (a live `reference` update, a spark resize) gets no `pointerleave`,
	// so its unmount clears the emphasis it holds. Only the handlers and the
	// cleanup read it.
	const pointed = useRef(false)

	useEffect(
		() => () => {
			if (pointed.current) setReferenceActive(null)
		},
		[setReferenceActive],
	)

	const color = rawColor(paint)

	const focused = activeReference === index

	// Another rule holds the emphasis: this one recedes to it, the way the data
	// marks do, so pointing one rule reads it clear of the rest.
	const receded = emphasizedReference !== null && emphasizedReference !== index

	return (
		<Tooltip placement={orientation === 'vertical' ? 'top' : 'right'} delay={0} open={focused}>
			<TooltipTrigger>
				{/* Pointing the rule recedes the marks and the sibling rules to it
				    (composes with the tooltip's own hover handlers through the trigger). */}
				<g
					data-slot="chart-reference-line"
					data-focused={dataAttr(focused)}
					className={seriesGroupClass(receded)}
					onPointerEnter={() => {
						pointed.current = true

						setReferenceActive(index)
					}}
					onPointerLeave={() => {
						pointed.current = false

						setReferenceActive(null)
					}}
				>
					{/* The drawn rule over its wide transparent hover target; the pair
					    reveals as one, so the hit line rises with the rule it stands in for. */}
					<RuleRise rise={rise}>
						<ReferenceRuleStroke line={line} paint={paint} points={points} />

						<line
							{...points}
							stroke="transparent"
							strokeWidth={REFERENCE_HIT_WIDTH}
							pointerEvents="stroke"
						/>
					</RuleRise>
				</g>
			</TooltipTrigger>

			<TooltipContent size="sm">
				<div aria-hidden="true" className="flex items-center gap-1.5 whitespace-nowrap">
					<span
						data-slot="chart-reference-swatch"
						className={cn(
							'inline-block h-[2px] w-3 rounded-full',
							textClass(paint) && cn(textClass(paint), 'bg-current'),
						)}
						style={color ? { backgroundColor: color } : undefined}
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
 * marks, so a rule keeps only its ink. It still rides the mount rise, since
 * spark strips interactivity, not the drawing.
 *
 * @internal
 */
function SparkReferenceRule({ line, paint, points, rise }: ReferenceRuleProps) {
	return (
		<g data-slot="chart-reference-line" pointerEvents="none">
			<RuleRise rise={rise}>
				<ReferenceRuleStroke line={line} paint={paint} points={points} />
			</RuleRise>
		</g>
	)
}

/**
 * One reference rule, in one of three renderings:
 *
 * - The bare {@link SparkReferenceRule} at the spark tier, read through
 *   {@link ChartTierContext} so the frame decides and no chart gates it.
 * - The standing {@link LabeledReferenceRule} under `labels`.
 * - The interactive {@link HoverReferenceRule} otherwise.
 *
 * All draw the same dashed rule; they differ only in whether the value reads
 * from nothing, a fixed label, or a hover-and-keyboard tooltip.
 *
 * @internal
 */
function ReferenceRule(props: ReferenceRuleProps) {
	const spark = useChartTier() === 'spark'

	if (spark) return <SparkReferenceRule {...props} />

	return props.labels ? <LabeledReferenceRule {...props} /> : <HoverReferenceRule {...props} />
}

/**
 * Reference lines at fixed values, drawn across the band axis. Each rule sits at
 * the value-axis position that the chart projected for it, as a grid line of
 * {@link ChartGridLines} does, but over the marks instead of under them. A
 * target or threshold therefore reads against the data, rather than hiding
 * behind it. Each rule
 * floats its value and label from a {@link Tooltip} on hover, or — under
 * `labels` — carries them in a standing label at its far end.
 *
 * @remarks Self-gating. A chart mounts it unconditionally, and it draws nothing
 * until both a scale and reference lines exist. The gate therefore lives here
 * instead of at every call site. Render it last, over the hit area, so the rules
 * win the pointer where they sit. Under `animate` each rule rises along the
 * value axis from the baseline to its value ({@link referenceRise}). A
 * {@link ReducedMotion} around it settles it at rest for a reduced-motion
 * preference. Under `labels` each rule carries a standing value label at its far
 * end and drops the hover tooltip — the `labels.references` mode. At the spark
 * tier each rule sheds its hit target, tooltip, and label to the bare dashed
 * stroke. That tier is read through {@link ChartTierContext}, over either mode.
 * A sparkline is read-only, so the rules keep their ink and give up the pointer.
 * @internal
 */
export function ChartReferenceLines({
	chart,
	reference,
	animate = false,
	labels = false,
}: ChartReferenceLinesProps) {
	if ((!chart.yScale && !chart.y2Scale) || !reference || reference.length === 0) return null

	const { plot, orientation, referencePositions } = chart

	const keys = ruleKeys(reference)

	const group = (
		<g data-slot="chart-reference-lines">
			{reference.map((line, index) => {
				const axis = line.axis ?? 'y'

				const ruleScale = axis === 'y2' ? chart.y2Scale : chart.yScale

				// The chart projected each rule once. A rule it holds `null` for draws
				// nothing, but keeps its slot, so a shown rule's emphasis still keys off
				// its own `reference` index.
				const at = referencePositions[index] ?? null

				if (!ruleScale || at === null) return null

				const { from, to } = valueRule(orientation, plot, at)

				// The zero line each rule reveals from: the baseline the bars grow from,
				// on the rule's own axis. `map` clamps into the scale's range, so zero
				// lands on the plot even off-domain. Revealing from here points every
				// rule the way its value does, as the bar that would reach it grows.
				const rise = animate ? referenceRise(orientation, ruleScale.map(0) - at) : null

				return (
					<ReferenceRule
						key={keys[index]}
						line={line}
						index={index}
						paint={resolvePaint(line.color ?? DEFAULT_REFERENCE_COLOR)}
						points={{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }}
						orientation={orientation}
						format={(value) => chart.formatAxisValue(value, axis)}
						rise={rise}
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
	/** Formats each rule's value with its axis's formatter. */
	format: ReferenceFormat
	/**
	 * Reference indexes toggled off through their legend chips. They are dropped
	 * from the parity, so it reads the rules the plot still draws. That is the way
	 * the data table follows the visible series. Empty by default.
	 */
	hidden?: ReadonlySet<number>
}

/**
 * The reference lines' visually-hidden parity: each rule's label and value in
 * plain markup outside the `role="img"` region. Assistive tech therefore reads
 * them without the pointer. The hover tooltip stays an enhancement, the same
 * contract as the data table. A rule toggled off through its chip drops out, so
 * the parity tracks what the plot draws.
 *
 * @internal
 */
export function ChartReferenceList({ reference, format, hidden }: ChartReferenceListProps) {
	const lines =
		reference?.filter((line, index) => Number.isFinite(line.value) && !hidden?.has(index)) ?? []

	if (lines.length === 0) return null

	const keys = ruleKeys(lines)

	return (
		<ul data-slot="chart-reference-list" className="sr-only">
			{lines.map((line, index) => (
				<li key={keys[index]}>{referenceText(line, format)}</li>
			))}
		</ul>
	)
}
