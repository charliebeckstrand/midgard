'use client'

import { AnimatePresence } from 'motion/react'
import { type ReactNode, useEffect, useRef } from 'react'
import { Swatch } from '../../../components/swatch'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core/cn'
import { dataAttr } from '../../../core/data-attr'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../recipes/kata/chart'
import {
	type ChartPaint,
	inkClass,
	rawColor,
	resolvePaint,
	strokeClass,
	textClass,
} from './chart-color/paint'
import {
	LABEL_GAP,
	MARKER_REACH,
	REFERENCE_HIT_WIDTH,
	REFERENCE_STROKE_WIDTH,
} from './chart-constants'
import {
	type LabelLine,
	markerBox,
	type PlacedReferenceLabel,
	referenceLabels,
} from './chart-geometry/label'
import { type RuleBreak, ruleDashArray } from './chart-geometry/rule'
import { REFERENCE_FALL, REFERENCE_RISE, referenceRise } from './chart-motion'
import {
	type ChartOrientation,
	crossOrientation,
	type PlotRect,
	type Vec,
	valueRule,
} from './chart-orientation'
import { ChartReadoutRow } from './chart-readout-card'
import {
	type ChartReferenceLine,
	type ChartReferenceValue,
	DEFAULT_REFERENCE_COLOR,
	isCategoryReference,
	type ReferenceFormat,
	referenceText,
	ruleKeys,
} from './chart-reference'
import type { ValueScale } from './chart-scale'
import { seriesGroupClass } from './chart-series'
import { useChartActions, useChartEmphasis, useChartTier } from './context'
import {
	LABEL_PART_SPACE,
	type ReferenceLabelCut,
	type ReferenceLabelParts,
	type ReferenceLabelWidth,
	referenceLabelParts,
} from './use-chart-reference-label-width'

/**
 * The part of a cartesian chart that its reference rules read: the plot, the
 * value scales, the facing, the formatter, and the position and the legend state
 * of each rule.
 *
 * @internal
 */
export type ChartReferenceFrame = {
	plot: PlotRect
	/** The drawn width of a standing label ({@link useReferenceLabelWidth}). */
	referenceLabelWidth: ReferenceLabelWidth
	/** A standing label cut to fit a room ({@link useReferenceLabelWidth}). */
	referenceLabelCut: ReferenceLabelCut
	/** The resolved primary value scale, or `null` before a domain resolves. */
	yScale: ValueScale | null
	/** The secondary scale, for rules bound to `y2`. */
	y2Scale: ValueScale | null
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
	/**
	 * The band-axis position of each category rule, aligned with the
	 * `reference` prop. `null`, or past its end, where the rule is a value rule
	 * or its category draws no band.
	 */
	categoryReferencePositions: (number | null)[]
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
	 * The placed standing labels from {@link placeReferenceLabels}, aligned with
	 * `reference`: the `labels.references` mode. Each rule draws its label on
	 * it in place of the hover tooltip. The label shows the parts that the
	 * placement chose ({@link StandingReferenceLabel}). The rules then shed their pointer target
	 * and float no surface. The caller also drops their keyboard stop
	 * ({@link referenceStops}), since the label reads the value where pointing
	 * once did. A rule with no label, or with the whole prop omitted, floats the
	 * hover tooltip.
	 */
	labels?: (StandingReferenceLabel | null)[]
	/**
	 * The point markers that the chart draws. A rule breaks around each marker
	 * that sits on it, so the dash does not cross the point
	 * ({@link pointsOnRule}).
	 */
	points?: readonly Vec[]
}

/**
 * The glyphs of a standing label: the lead, and then the tail in
 * {@link k.mark.value}, {@link LABEL_PART_SPACE} after it. Both take the ink of
 * the label, unless `valuePaint` inks the tail on its own. The tail sets the
 * central baseline of its label again. SVG 1.1 does not inherit
 * `dominant-baseline`, so an engine that follows it puts a tail on another
 * baseline than its lead.
 *
 * @internal
 */
function ReferenceLabelGlyphs({
	parts,
	valuePaint,
}: {
	parts: ReferenceLabelParts
	valuePaint?: ChartPaint
}) {
	const color = valuePaint && rawColor(valuePaint)

	return (
		<>
			{parts.lead}

			{parts.tail && (
				<tspan
					dx={LABEL_PART_SPACE}
					dominantBaseline="central"
					className={cn(k.mark.value, valuePaint && inkClass(valuePaint))}
					style={color ? { fill: color } : undefined}
				>
					{parts.tail}
				</tspan>
			)}
		</>
	)
}

/** The position of a rule: along the band axis for a category rule, else along the value axis. @internal */
function rulePosition(chart: ChartReferenceFrame, line: ChartReferenceLine, index: number) {
	const positions = isCategoryReference(line)
		? chart.categoryReferencePositions
		: chart.referencePositions

	return positions[index] ?? null
}

/** Which standing reference labels {@link placeReferenceLabels} places. @internal */
export type ReferenceLabelModes = {
	/** The labels of the value rules: the `labels.references` mode. */
	values: boolean
	/** The labels of the category rules, which stand whenever there is room. */
	categories: boolean
	/**
	 * Show the value after the own label of a value rule:
	 * `labels.references.value`.
	 */
	withValue: boolean
	/**
	 * The indexes of the rules that the legend names: each takes no label, in
	 * either mode.
	 */
	listed: ReadonlySet<number>
}

/**
 * A placed standing label and the parts of its text, which the placement
 * measured. The rules draw the same parts, so the text and its spot agree.
 *
 * @internal
 */
export type StandingReferenceLabel = PlacedReferenceLabel & {
	parts: ReferenceLabelParts
	/**
	 * The rule reads its value on hover (`valueDisplay: 'hover'`), or its label
	 * is cut: it keeps its hover tooltip and its keyboard stop beside the label.
	 */
	hover: boolean
}

/**
 * Places the standing reference labels, aligned with `reference`, or none when
 * there is no rule. Each label sits on its rule, which breaks for it. A value
 * rule takes a label only under the `labels.references` mode. A category rule
 * takes one whenever it has a label, because the plot label is its one visible
 * name. A rule that the legend names takes none
 * (`modes.listed`). The caller turns both off at the spark tier,
 * which draws no label. The chart places them once and passes them to
 * {@link ChartReferenceLines}, which draws them, and to the point value labels,
 * which drop where they meet one. Each label takes the most open free spot on
 * its rule ({@link referenceLabels}). Where it can, the spot is clear of the
 * drawn point markers in `points`, the drawn lines in `lines`, the other rules,
 * and the other labels. A value rule whose label finds none keeps its hover
 * tooltip. A category rule whose label finds none reads in the readout of its
 * category only.
 *
 * @internal
 */
export function placeReferenceLabels(
	chart: ChartReferenceFrame,
	reference: ChartReferenceLine[] | undefined,
	modes: ReferenceLabelModes,
	points: readonly Vec[] = [],
	lines: readonly LabelLine[] = [],
): (StandingReferenceLabel | null)[] | undefined {
	if (!reference || reference.length === 0) return undefined

	if (!modes.values && !(modes.categories && reference.some(isCategoryReference))) return undefined

	const parts = reference.map((line) =>
		referenceLabelParts(
			line,
			(value) => chart.formatAxisValue(value, line.axis ?? 'y'),
			modes.withValue,
		),
	)

	const placed = referenceLabels(
		reference.map((line, index) => {
			const text = parts[index] ?? { lead: '', tail: '' }

			const category = isCategoryReference(line)

			const shown =
				!modes.listed.has(index) && (category ? modes.categories && text.lead !== '' : modes.values)

			return {
				at: rulePosition(chart, line, index),
				width: chart.referenceLabelWidth(text),
				orientation: category ? crossOrientation(chart.orientation) : undefined,
				unlabeled: !shown,
				cut: (room: number) => {
					const short = chart.referenceLabelCut(text, room)

					return short && chart.referenceLabelWidth(short)
				},
			}
		}),
		chart.orientation,
		chart.plot,
		{ markers: points.map(markerBox), lines },
	)

	return placed.map((label, index) => {
		if (!label) return null

		const text = parts[index] ?? { lead: '', tail: '' }

		const line = reference[index]

		// A cut label draws the cut that its width holds. A value rule then keeps
		// its tooltip and its keyboard stop, which read the whole label.
		return {
			...label,
			parts: (label.cut && chart.referenceLabelCut(text, label.width)) || text,
			hover:
				hoversValue(line) ||
				(Boolean(label.cut) && line !== undefined && !isCategoryReference(line)),
		}
	})
}

/**
 * A labeled value rule that reads its value on hover, not on its standing
 * label (`valueDisplay: 'hover'`). @internal
 */
function hoversValue(line: ChartReferenceLine | undefined): boolean {
	return (
		line !== undefined &&
		!isCategoryReference(line) &&
		Boolean(line.label) &&
		line.valueDisplay === 'hover'
	)
}

/**
 * The keyboard stops of the reference rules: each rule's position, or `null`
 * for a rule that carries a standing label ({@link placeReferenceLabels}). A
 * labeled rule reads its value without the rove, so it leaves the value-axis
 * roving as it leaves the hover tooltip. A rule whose label found no free spot,
 * or whose value reads on hover, keeps both.
 *
 * @internal
 */
export function referenceStops(
	labels: (StandingReferenceLabel | null)[] | undefined,
	positions: (number | null)[],
): (number | null)[] {
	return labels
		? positions.map((at, index) => {
				const label = labels[index]

				return label && !label.hover ? null : at
			})
		: positions
}

/** Props for {@link ReferenceRule}. @internal */
type ReferenceRuleProps = {
	line: ChartReferenceLine
	/** The rule's position in the `reference` array: its identity to the keyboard emphasis. */
	index: number
	/** The rule's paint, resolved once for the stroke, the label, and the tooltip swatch. */
	paint: ChartPaint
	/** The two endpoints of the drawn rule. */
	points: RulePoints
	orientation: ChartOrientation
	format: (value: number) => string
	/** The mount slide-in transform from {@link referenceRise}, or `null` when the chart is static. */
	rise: ReturnType<typeof referenceRise> | null
	/**
	 * The placed standing label of the rule ({@link placeReferenceLabels}),
	 * which {@link ReferenceLabel} draws in place of the hover tooltip. The rule
	 * then sheds its wide hit target and floats no surface, and the caller drops
	 * its keyboard stop, unless its value reads on hover (`label.hover`). `null`
	 * when the mode is off, or when the label found no free spot.
	 */
	label: StandingReferenceLabel | null
	/**
	 * The `stroke-dasharray` of the rule: its dashes between its breaks
	 * ({@link ruleBreaks}), or `undefined` for a solid rule with no break.
	 */
	dashes: number[] | undefined
}

/** The two endpoints of a rule's drawn line, in `viewBox` user units. @internal */
type RulePoints = { x1: number; y1: number; x2: number; y2: number }

/** The radius of the hole that a point marker cuts in a rule: its reach and the gap. @internal */
const POINT_BREAK = MARKER_REACH + LABEL_GAP

/**
 * The point markers that sit on a rule from `from` to `to`: each marker whose
 * hole ({@link POINT_BREAK}) meets the stroke. The rule breaks around each of
 * them, so its dash stops short of the point and does not cross it. A rule is
 * straight along one axis, so the distance to it is the distance across that
 * axis, measured only where the marker is along the rule.
 *
 * @internal
 */
export function pointsOnRule(points: readonly Vec[], from: Vec, to: Vec): Vec[] {
	const reach = POINT_BREAK + REFERENCE_STROKE_WIDTH / 2

	const [x0, x1] = [Math.min(from.x, to.x), Math.max(from.x, to.x)]

	const [y0, y1] = [Math.min(from.y, to.y), Math.max(from.y, to.y)]

	return points.filter((point) => {
		const dx = Math.max(x0 - point.x, 0, point.x - x1)

		const dy = Math.max(y0 - point.y, 0, point.y - y1)

		return Math.hypot(dx, dy) < reach
	})
}

/** The span of a label's text along the x axis, from where it anchors. @internal */
function textSpan(label: PlacedReferenceLabel): { x0: number; x1: number } {
	if (label.anchor === 'end') return { x0: label.x - label.width, x1: label.x }

	if (label.anchor === 'start') return { x0: label.x, x1: label.x + label.width }

	return { x0: label.x - label.width / 2, x1: label.x + label.width / 2 }
}

/**
 * The breaks of a rule from `from` to `to`, as spans from its start. A rule
 * breaks for each standing label in `labels` that it crosses or comes nearer to
 * than {@link LABEL_GAP}, not only for its own. Thus no dash shows through,
 * or runs along, a label that another rule passes under. It
 * also breaks around each point marker in `points` that sits on it
 * ({@link pointsOnRule}). Each break clears its label or its marker by
 * {@link LABEL_GAP} on each side. A label text runs horizontally: a
 * horizontal rule breaks for the measured width of the text, and a vertical
 * rule for the height of the label.
 *
 * @internal
 */
export function ruleBreaks(
	from: Vec,
	to: Vec,
	labels: readonly PlacedReferenceLabel[],
	points: readonly Vec[],
): RuleBreak[] {
	const across = from.x === to.x

	// The position along the rule, and across it, of a point of the plot.
	const along = (x: number, y: number) => (across ? y - from.y : x - from.x)

	const offset = (point: Vec) => (across ? point.x - from.x : point.y - from.y)

	const [x0, x1] = [Math.min(from.x, to.x), Math.max(from.x, to.x)]

	const [y0, y1] = [Math.min(from.y, to.y), Math.max(from.y, to.y)]

	// A label that comes nearer to the rule than the gap also breaks it, so that a
	// close rule does not run along the glyphs of its neighbor's label.
	const crossed = labels.filter(
		({ box }) =>
			box.x0 - LABEL_GAP <= x1 &&
			x0 <= box.x1 + LABEL_GAP &&
			box.y0 - LABEL_GAP <= y1 &&
			y0 <= box.y1 + LABEL_GAP,
	)

	const labelBreaks = crossed.map((label): RuleBreak => {
		if (across) {
			return {
				from: along(0, label.box.y0) - LABEL_GAP,
				to: along(0, label.box.y1) + LABEL_GAP,
			}
		}

		const span = textSpan(label)

		return { from: along(span.x0, 0) - LABEL_GAP, to: along(span.x1, 0) + LABEL_GAP }
	})

	const pointBreaks = pointsOnRule(points, from, to).map((point): RuleBreak => {
		const half = Math.sqrt(Math.max(POINT_BREAK ** 2 - offset(point) ** 2, 0))

		const at = along(point.x, point.y)

		return { from: at - half, to: at + half }
	})

	return [...labelBreaks, ...pointBreaks]
}

/**
 * A dash pattern as `stroke-dasharray` text, to two decimals. Each end rounds
 * from the start of the rule, not each length alone, so the rounding does not
 * add up along the rule, and each break keeps its place. @internal
 */
function roundDashes(dashes: readonly number[]): string {
	const round = (value: number) => Math.round(value * 100) / 100

	let at = 0

	return dashes
		.map((length) => {
			const from = round(at)

			at += length

			return round(round(at) - from)
		})
		.join(' ')
}

/**
 * The dashed value-axis rule itself, shared by the three renderings: a named
 * slot's stroke class, or a raw hex / `oklch()` color inline. Never takes the
 * pointer: the hover rendering lays its own transparent hit line over this.
 * The rule draws its dashes between its breaks from one computed
 * `stroke-dasharray` ({@link ruleDashArray}), so each piece starts and ends on
 * a full dash, and the clear space at each side of a break is the same.
 * @internal
 */
function ReferenceRuleStroke({
	paint,
	points,
	dashes,
}: Pick<ReferenceRuleProps, 'paint' | 'points' | 'dashes'>) {
	const color = rawColor(paint)

	return (
		<line
			{...points}
			strokeWidth={REFERENCE_STROKE_WIDTH}
			strokeDasharray={dashes && roundDashes(dashes)}
			className={strokeClass(paint)}
			style={color ? { stroke: color } : undefined}
			pointerEvents="none"
		/>
	)
}

/**
 * The mount slide-in of a rule: its content in a `m.g` that rises from the
 * baseline, or the content as is on a static chart. The rule, its hit line, and
 * its label ride it as one. A rule toggled off through its legend chip runs the
 * rise in reverse and fades as it falls ({@link REFERENCE_FALL}). @internal
 */
function RuleRise({ rise, children }: { rise: ReferenceRuleProps['rise']; children: ReactNode }) {
	// The server cannot read the preference, so it renders the rule at its value.
	const still = usePrefersReducedMotion()

	return rise ? (
		<m.g
			{...rise}
			initial={still ? false : rise.initial}
			// `MotionConfig reducedMotion` does not skip opacity, so a reduced-motion
			// preference drops the exit, and the rule leaves at once.
			exit={still ? undefined : { ...rise.initial, opacity: 0, transition: REFERENCE_FALL }}
			transition={REFERENCE_RISE}
		>
			{children}
		</m.g>
	) : (
		children
	)
}

/**
 * The labeled rendering: the rule alone, with no hover target and no tooltip.
 * Its standing label draws in the label layer over every rule
 * ({@link ReferenceLabel}). The label reads what pointing would, so the rule
 * drops the hover path (and the caller drops its keyboard stop).
 *
 * @internal
 */
function LabeledReferenceRule(props: ReferenceRuleProps) {
	const { index, rise } = props

	const { emphasizedReference } = useChartEmphasis()

	// A standing rule has no hover target of its own, but a legend chip's emphasis
	// still recedes the siblings of the rule it names. Their labels recede with them.
	const receded = emphasizedReference !== null && emphasizedReference !== index

	return (
		<g data-slot="chart-reference-line" pointerEvents="none" className={seriesGroupClass(receded)}>
			<RuleRise rise={rise}>
				<ReferenceRuleStroke {...props} />
			</RuleRise>
		</g>
	)
}

/**
 * The standing label of a rule, on the rule, which breaks for it. The name is
 * inked to match the rule: a slot through its fill class, or a raw color
 * inline. The value of a value rule follows the name, one weight lighter, in
 * the same ink or in its `valueColor` ({@link ReferenceLabelGlyphs}). It
 * recedes with its rule and rides the same mount rise, so rule and label
 * reveal as one. It draws in a layer over every rule, so its halo clears a
 * neighboring rule that crosses it. A cut label floats the whole readout of
 * its rule in a {@link Tooltip} on hover ({@link ReferenceReadout}).
 *
 * @internal
 */
function ReferenceLabel({
	index,
	paint,
	rise,
	label,
	line,
	format,
}: Pick<ReferenceRuleProps, 'index' | 'paint' | 'rise' | 'line' | 'format'> & {
	label: StandingReferenceLabel
}) {
	const { emphasizedReference } = useChartEmphasis()

	const color = rawColor(paint)

	const receded = emphasizedReference !== null && emphasizedReference !== index

	const text = (
		<text
			data-slot="chart-reference-label"
			data-cut={dataAttr(Boolean(label.cut))}
			x={label.x}
			y={label.y}
			textAnchor={label.anchor}
			dominantBaseline="central"
			className={cn(k.mark.label, inkClass(paint))}
			style={color ? { fill: color } : undefined}
		>
			<ReferenceLabelGlyphs
				parts={label.parts}
				valuePaint={line.valueColor === undefined ? undefined : resolvePaint(line.valueColor)}
			/>
		</text>
	)

	return (
		<g pointerEvents="none" className={seriesGroupClass(receded)}>
			<RuleRise rise={rise}>
				{label.cut ? (
					// A cut label floats its whole readout on hover. Its box takes the
					// pointer, so the gaps between the glyphs do too.
					<Tooltip placement="top" delay={0}>
						<TooltipTrigger>
							<g data-slot="chart-reference-label-target">
								<rect
									x={label.box.x0}
									y={label.box.y0}
									width={label.box.x1 - label.box.x0}
									height={label.box.y1 - label.box.y0}
									fill="transparent"
									pointerEvents="all"
								/>

								{text}
							</g>
						</TooltipTrigger>

						<TooltipContent size="sm">
							<ReferenceReadout line={line} paint={paint} format={format} />
						</TooltipContent>
					</Tooltip>
				) : (
					text
				)}
			</RuleRise>
		</g>
	)
}

/**
 * The readout of a rule in its tooltip, in the {@link ChartReadoutRow} that the
 * category readout gives a rule too: the key of the rule, then the value of a
 * value rule and its label, or the label of a category rule. The description
 * follows. The text wraps inside the width cap of the tooltip. It is
 * `aria-hidden`, since {@link ChartReferenceList} carries the parity.
 *
 * @internal
 */
function ReferenceReadout({
	line,
	paint,
	format,
}: Pick<ReferenceRuleProps, 'line' | 'paint' | 'format'>) {
	const color = rawColor(paint)

	const category = isCategoryReference(line)

	// The value rule leads with its value, as a series row does. A category rule
	// leads with its label, as its note in the category readout does.
	const lead = category ? line.label : format(line.value)

	const rest = [category ? undefined : line.label, line.description].filter(Boolean).join(' ')

	return (
		<ChartReadoutRow
			aria-hidden="true"
			swatch={
				// The same key as the legend chip of the rule, which keeps a paint under
				// forced colors.
				<Swatch
					data-slot="chart-reference-swatch"
					shape="line"
					size="sm"
					variant={line.dashed === false ? 'solid' : 'dashed'}
					color={textClass(paint) || undefined}
					style={color ? { color } : undefined}
				/>
			}
			value={lead}
			label={rest || undefined}
		/>
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
function HoverReferenceRule(props: ReferenceRuleProps & { line: ChartReferenceValue }) {
	const { line, index, paint, points, orientation, format, rise } = props

	const { activeReference, emphasizedReference } = useChartEmphasis()

	const { pointReference: setReferenceActive } = useChartActions()

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
						<ReferenceRuleStroke {...props} />

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
				<ReferenceReadout line={line} paint={paint} format={format} />
			</TooltipContent>
		</Tooltip>
	)
}

/**
 * The spark rendering: the dashed rule alone, pointer-inert (no hit target,
 * no tooltip, no standing label, no emphasis). A sparkline is read-only bare
 * marks, so a rule keeps only its ink. It still rides the mount rise, since
 * spark strips interactivity, not the drawing.
 *
 * @internal
 */
function SparkReferenceRule(props: ReferenceRuleProps) {
	const { rise } = props

	return (
		<g data-slot="chart-reference-line" pointerEvents="none">
			<RuleRise rise={rise}>
				<ReferenceRuleStroke {...props} />
			</RuleRise>
		</g>
	)
}

/**
 * One reference rule, in one of three renderings:
 *
 * - The bare {@link SparkReferenceRule} at the spark tier, read through
 *   {@link ChartTierContext} so the frame decides and no chart gates it.
 * - The standing {@link LabeledReferenceRule} under `labels`, and for each
 *   category rule.
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

	const { line } = props

	// A category rule takes no pointer: the readout of its category reads it. A
	// labeled rule whose value reads on hover keeps its pointer and its tooltip.
	return (props.label && !props.label.hover) || isCategoryReference(line) ? (
		<LabeledReferenceRule {...props} />
	) : (
		<HoverReferenceRule {...props} line={line} />
	)
}

/**
 * The presence of the rules on an animated chart, so a rule toggled off plays
 * its exit. A static chart removes the rule at once. No rule animates its
 * layout, so the presence keeps one context value through a render. @internal
 */
function RulePresence({ animate, children }: { animate: boolean; children: ReactNode }) {
	return animate ? (
		<AnimatePresence presenceAffectsLayout={false}>{children}</AnimatePresence>
	) : (
		children
	)
}

/**
 * Reference lines at fixed values, drawn across the band axis. Each rule sits at
 * the value-axis position that the chart projected for it, as a grid line of
 * {@link ChartGridLines} does, but over the marks instead of under them. A
 * target or threshold therefore reads against the data, rather than hiding
 * behind it. Each rule
 * floats its value and label from a {@link Tooltip} on hover, or (under
 * `labels`) carries them in a standing label on it. A rule breaks for its
 * standing label and around each point marker in `points` that sits on it.
 *
 * @remarks Self-gating. A chart mounts it unconditionally, and it draws nothing
 * until both a scale and reference lines exist. The gate therefore lives here
 * instead of at every call site. Render it last, over the hit area, so the rules
 * win the pointer where they sit. Under `animate` each rule rises along the
 * value axis from the baseline to its value ({@link referenceRise}). A
 * {@link ReducedMotion} around it settles it at rest for a reduced-motion
 * preference. Under `labels` each rule carries a standing label on it
 * and drops the hover tooltip: the `labels.references` mode. The chart
 * places the labels ({@link placeReferenceLabels}), so no two overlap, and a rule
 * whose label finds no free spot keeps the hover tooltip. At the spark
 * tier each rule sheds its hit target, tooltip, and label to the bare dashed
 * stroke. That tier is read through {@link ChartTierContext}, over either mode.
 * A sparkline is read-only, so the rules keep their ink and give up the pointer.
 * @internal
 */
export function ChartReferenceLines({
	chart,
	reference,
	animate = false,
	labels,
	points = [],
}: ChartReferenceLinesProps) {
	if (!reference || reference.length === 0) return null

	const { plot, orientation } = chart

	const keys = ruleKeys(reference)

	const rules = reference.flatMap(
		(line, index): (Omit<ReferenceRuleProps, 'dashes'> & { key: string; from: Vec; to: Vec })[] => {
			const axis = line.axis ?? 'y'

			const scale = axis === 'y2' ? chart.y2Scale : chart.yScale

			const category = isCategoryReference(line)

			// The chart projected each rule once. A rule it holds `null` for draws
			// nothing, but keeps its slot, so a shown rule's emphasis still keys off
			// its own `reference` index.
			const at = rulePosition(chart, line, index)

			if ((!category && !scale) || at === null) return []

			// A category rule spans the value axis at its band, which is the value rule
			// of the other facing.
			const { from, to } = valueRule(
				category ? crossOrientation(orientation) : orientation,
				plot,
				at,
			)

			// The zero line each value rule reveals from: the baseline the bars grow
			// from, on the rule's own axis. `map` clamps into the scale's range, so zero
			// lands on the plot even off-domain. Revealing from here points every
			// rule the way its value does, as the bar that would reach it grows. A
			// category rule has no value to grow to, so it stands at once.
			const rise =
				animate && scale && !category ? referenceRise(orientation, scale.map(0) - at) : null

			const format = (value: number) => chart.formatAxisValue(value, axis)

			return [
				{
					key: keys[index] ?? String(index),
					from,
					to,
					line,
					index,
					paint: resolvePaint(line.color ?? DEFAULT_REFERENCE_COLOR),
					points: { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
					orientation,
					format,
					rise,
					label: labels?.[index] ?? null,
				},
			]
		},
	)

	// Every standing label, so each rule breaks for each label that it crosses.
	const placed = rules.flatMap(({ label }) => (label ? [label] : []))

	// The labels draw after every rule, so no rule paints over a label's halo. A
	// rule toggled off leaves its presence as it last drew, and plays its exit there.
	const group = (
		<g data-slot="chart-reference-lines">
			<RulePresence animate={animate}>
				{rules.map(({ key, from, to, ...rule }) => (
					<ReferenceRule
						key={key}
						{...rule}
						dashes={ruleDashArray(
							Math.hypot(to.x - from.x, to.y - from.y),
							ruleBreaks(from, to, placed, points),
							rule.line.dashed !== false,
						)}
					/>
				))}
			</RulePresence>

			<RulePresence animate={animate}>
				{rules.map(({ key, ...rule }) =>
					rule.label ? <ReferenceLabel key={key} {...rule} label={rule.label} /> : null,
				)}
			</RulePresence>
		</g>
	)

	return animate ? <ReducedMotion>{group}</ReducedMotion> : group
}

/** Props for {@link ChartReferenceList}. @internal */
export type ChartReferenceListProps = {
	reference: ChartReferenceLine[] | undefined
	/** Formats each rule's value with its axis's formatter. */
	format: ReferenceFormat
	/** Writes a category as the band axis does. */
	formatCategory?: (category: string) => string
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
export function ChartReferenceList({
	reference,
	format,
	formatCategory,
	hidden,
}: ChartReferenceListProps) {
	const lines =
		reference?.filter(
			(line, index) =>
				(isCategoryReference(line) || Number.isFinite(line.value)) && !hidden?.has(index),
		) ?? []

	if (lines.length === 0) return null

	const keys = ruleKeys(lines)

	return (
		<ul data-slot="chart-reference-list" className="sr-only">
			{lines.map((line, index) => (
				<li key={keys[index]}>{referenceText(line, format, formatCategory)}</li>
			))}
		</ul>
	)
}
