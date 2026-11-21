import type { ReactElement, ReactNode } from 'react'
import type { AccessibleName } from '../../../../types/accessible-name'
import { once } from '../../../../utilities/once'
import { ChartCartesianAxes } from '../chart-axes/cartesian'
import type { ChartValueAxisId } from '../chart-axes/schema'
import {
	ChartCrosshair,
	type Crosshair,
	crosshairSnaps,
	resolveCrosshair,
} from '../chart-crosshair'
import type { LabelLine } from '../chart-geometry/label'
import type { ChartLineSeries } from '../chart-geometry/line'
import { ChartHitArea, cartesianHitActive } from '../chart-hit-area'
import { type RuleStop, type ThinMark, thinMarksAt } from '../chart-hit-test'
import { ChartLegend, ChartLegendNotes, ChartLegendReferences } from '../chart-legend/legend'
import { legendAside } from '../chart-legend/schema'
import { ChartMarksLayer } from '../chart-marks/layer'
import type { ChartOrientation, Vec } from '../chart-orientation'
import { referenceText } from '../chart-reference'
import {
	ChartReferenceLines,
	ChartReferenceList,
	placeReferenceLabels,
	referenceStops,
} from '../chart-reference-lines'
import { snappedSeriesAt, snapTargets } from '../chart-snap'
import { resolveTooltip } from '../chart-tooltip'
import {
	type ChartValueLabelConfig,
	ChartValueLabels,
	cartesianValueLabels,
} from '../chart-value-labels'
import { type ChartTarget, markTarget, targetMark } from '../context'
import type { CartesianChartProps } from '../types'
import type { CartesianChart } from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
import type { ChartMarkAt, ChartTargetAt } from '../use-chart-pointer'
import { ChartFrame, type ChartFrameProps, plotName } from './frame'

/**
 * Per category, the value-axis stops of a cartesian chart, and the series
 * behind each stop in the same order.
 *
 * @internal
 */
export type CartesianStops = {
	/** Per category, the value-axis position of each stop. */
	points: number[][]
	/** Per category, the series index behind each stop. */
	series: number[][]
}

/**
 * The line and area series of a chart: they carry the point value labels, and
 * their point markers break the reference rules that they sit on. The standing
 * reference labels keep clear of their lines and markers where they can.
 *
 * @internal
 */
export type CartesianValueLabelSeries = {
	/** The drawn series, in the order the labels resolve their overlaps. */
	list: ChartLineSeries[]
}

/**
 * The point markers that a list of line and area series draws: each point of a
 * series with markers on, and each isolated point of a series with them off,
 * as the marks draw them. @internal
 */
function drawnPoints(list: readonly ChartLineSeries[]): Vec[] {
	return list.flatMap(({ markers, geometry }) => (markers ? geometry.points : geometry.isolated))
}

/**
 * The lines that a list of line and area series draws: each run of two points
 * or more, and whether it curves. The reference labels keep clear of them.
 * @internal
 */
function drawnLines(list: readonly ChartLineSeries[]): LabelLine[] {
	return list.flatMap(({ geometry }) =>
		geometry.runs
			.filter((run) => run.length > 1)
			.map((run) => ({ points: run, smooth: geometry.smooth })),
	)
}

/** Props for {@link ChartCartesianFrame}. @internal */
export type ChartCartesianFrameProps = AccessibleName &
	Pick<ChartFrameProps, 'title' | 'subtitle' | 'contextMenu'> &
	Pick<CartesianChartProps<unknown>, 'crosshair' | 'tooltip' | 'animate' | 'reference'> & {
		/** The resolved chart the frame reads its sizing, tier, legend, and readout off. */
		chart: CartesianChart
		/** A fresh copy of the chart for the menu's fullscreen view. */
		fullscreen: ReactElement
		/** The chart's own marks, which the marks layer wraps. */
		marks: ReactNode
		/**
		 * The mark under the pointer: a bar or a wash. The frame resolves the thin
		 * marks first (the lines under `lineHits`, and the reference rules), and
		 * adds the snapped fallback off the marks, so this reads only the other
		 * drawn marks.
		 */
		markAt: ChartMarkAt
		/**
		 * The crosshair to draw when the `crosshair` prop is unset.
		 * @defaultValue no crosshair.
		 */
		defaultCrosshair?: Crosshair
		/**
		 * Draw the crosshair over the marks, as a bar chart does. Off, the crosshair
		 * draws under the marks, as on the line charts.
		 * @defaultValue false
		 */
		crosshairOver?: boolean
		/**
		 * The stops that the crosshair and the tooltip snap to, and that isolate a
		 * mark off the marks.
		 * @defaultValue the chart's own snap points and series.
		 */
		snapStops?: CartesianStops
		/**
		 * The stops that the keyboard cursor walks.
		 * @defaultValue {@link ChartCartesianFrameProps.snapStops}
		 */
		focusStops?: CartesianStops
		/**
		 * Which series draw bars: every series, or each series that the function
		 * picks. Off the marks, a snapped bar stop isolates its one bar, and a line
		 * or an area stop isolates its whole series.
		 * @defaultValue false
		 */
		bars?: boolean | ((series: number) => boolean)
		/**
		 * The value labels of the chart. With `references`, each value rule draws
		 * its label on it in place of its hover tooltip, its keyboard stop, and its
		 * legend chip.
		 */
		labels?: ChartValueLabelConfig
		/**
		 * The line and area series: they carry the point value labels, and their
		 * point markers break the reference rules. Omitted, no value label layer
		 * mounts, no rule breaks for a point, and the reference labels place
		 * without regard to the marks.
		 */
		valueLabels?: CartesianValueLabelSeries
		/**
		 * Whether the frame catches each line of `valueLabels` as a thin mark,
		 * with the reference rules, in one hit test ({@link thinMarksAt}). Off, as
		 * on an area chart that catches a series by its wash, only the rules are
		 * thin marks.
		 * @defaultValue false
		 */
		lineHits?: boolean
		className?: string
	}

/**
 * The thin marks that a held target holds among `strokes`: each of its rules,
 * and the line of each whole series among its marks. A bar or a disc holds
 * none.
 *
 * @internal
 */
function heldThinMarks(held: ChartTarget | null, strokes: readonly ChartLineSeries[]): ThinMark[] {
	if (held === null) return []

	const lines = held.marks.flatMap((mark): ThinMark[] => {
		if (mark.datum !== null) return []

		const line = strokes.findIndex((entry) => entry.index === mark.series)

		return line < 0 ? [] : [{ line }]
	})

	return [...lines, ...held.rules.map((rule) => ({ rule }))]
}

/** What {@link cartesianTargetAt} resolves the pointer against. @internal */
type CartesianHit = {
	orientation: ChartOrientation
	/** The lines that the frame catches as thin marks, in paint order. */
	strokes: readonly ChartLineSeries[]
	/** Where each rule that takes the pointer stands, or `null` ({@link pointerRules}). */
	rules: readonly (RuleStop | null)[]
	/** The hit test of the other marks of the chart, or `null` where it reads no mark. */
	markAt: ChartMarkAt | null
	/** The stops of the snapped readout, or `null` where the readout does not snap. */
	snap: CartesianStops | null
	/** Which series draw bars. */
	bars: boolean | ((series: number) => boolean)
	/** The count of categories that the pointer resolves, or 0 where it resolves none. */
	count: number
}

/** What {@link cartesianHit} reads from the frame. @internal */
type CartesianHitInput = Pick<CartesianHit, 'orientation' | 'rules' | 'bars' | 'count'> & {
	/** Whether a readout, a crosshair, or a band click wants the pointer. */
	readsMarks: boolean
	/** The hit test of the other marks of the chart. */
	markAt: ChartMarkAt
	/** Whether the frame catches the lines of `lines` as thin marks. */
	lineHits: boolean
	/** The visible line and area series, in paint order. */
	lines: readonly ChartLineSeries[] | undefined
	/** Whether the readout snaps, and the stops it snaps to. */
	snapping: boolean
	snap: CartesianStops
}

/**
 * What the hit area of a cartesian chart reads, or `null` where it reads
 * nothing. Where no readout, crosshair, or band click wants the pointer
 * (`readsMarks` off), it reads the rules alone, and only where a rule takes the
 * pointer. It then reads no mark and resolves no category.
 *
 * @internal
 */
function cartesianHit(input: CartesianHitInput): CartesianHit | null {
	const { readsMarks, lineHits, lines, snapping, snap, ...hit } = input

	if (readsMarks) {
		return { ...hit, strokes: lineHits ? (lines ?? []) : [], snap: snapping ? snap : null }
	}

	return hit.rules.some((stop) => stop !== null)
		? { ...hit, strokes: [], markAt: null, snap: null, count: 0 }
		: null
}

/**
 * The target of the thin marks in reach: the whole series of each line, and
 * each rule. It reads the data where it holds a line or a category rule, as
 * the readout of a category reads both. `null` where none is in reach.
 *
 * @internal
 */
function thinTarget(
	marks: readonly ThinMark[],
	strokes: readonly ChartLineSeries[],
	stops: readonly (RuleStop | null)[],
): ChartTarget | null {
	const series = marks.flatMap((mark) => {
		const stroke = mark.line === undefined ? undefined : strokes[mark.line]

		return stroke ? [{ series: stroke.index, datum: null }] : []
	})

	const rules = marks.flatMap((mark) => (mark.rule === undefined ? [] : [mark.rule]))

	if (series.length + rules.length === 0) return null

	return {
		marks: series,
		rules,
		data: series.length > 0 || rules.some((rule) => stops[rule]?.band === true),
	}
}

/**
 * Where each rule that takes the pointer stands, aligned with the `reference`
 * prop: a value rule with a keyboard stop at its value position, and a drawn
 * category rule at its band position. `null` for a rule that takes no pointer:
 * a value rule with a standing label, or a rule that draws nothing.
 *
 * @internal
 */
function pointerRules(
	valueStops: readonly (number | null)[],
	categoryStops: readonly (number | null)[],
): (RuleStop | null)[] {
	return Array.from({ length: Math.max(valueStops.length, categoryStops.length) }, (_, rule) => {
		const at = valueStops[rule] ?? null

		if (at !== null) return { at, band: false }

		const across = categoryStops[rule] ?? null

		return across === null ? null : { at: across, band: true }
	})
}

/**
 * The stop that a snapping readout anchors in the column of `index`, nearest
 * `value` along the value axis, or `null` where the readout does not snap. A
 * bar's stop isolates that one bar, and a line's or an area's stop its whole
 * series.
 *
 * @internal
 */
function snappedTarget(hit: CartesianHit, index: number | null, value: number): ChartTarget | null {
	if (hit.snap === null || index === null) return null

	const series = snappedSeriesAt(hit.snap.points, hit.snap.series, index, value)

	if (series === null) return null

	const bar = typeof hit.bars === 'function' ? hit.bars(series) : hit.bars

	return markTarget({ series, datum: bar ? index : null })
}

/**
 * The hit test of a cartesian chart. The thin marks resolve first: the lines
 * and the rules in reach, in one hit test ({@link thinMarksAt}), and each of
 * them joins the target ({@link thinTarget}). Off every thin mark, the other
 * marks of the chart resolve: its fills and its bars. Off every mark, a
 * snapping readout emphasizes the stop that the tooltip anchors in the column
 * ({@link snappedTarget}).
 *
 * @internal
 */
function cartesianTargetAt(hit: CartesianHit): ChartTargetAt {
	// The first pointer read builds the traces, so a render builds none.
	const traces = once(() => hit.strokes.map(({ geometry }) => geometry.trace()))

	const vertical = hit.orientation === 'vertical'

	return (x, y, held, index) => {
		const [band, value] = vertical ? [x, y] : [y, x]

		const thin = thinMarksAt(traces(), hit.rules, band, value, heldThinMarks(held, hit.strokes))

		if (thin.length > 0) return thinTarget(thin, hit.strokes, hit.rules)

		const direct = hit.markAt?.(x, y, targetMark(held), index) ?? null

		return direct === null ? snappedTarget(hit, index, value) : markTarget(direct)
	}
}

/** A series with no values, which labels nothing. Only a stale index reads it. @internal */
const NO_VALUES: { values: (number | null)[]; axis: ChartValueAxisId } = { values: [], axis: 'y' }

/**
 * The legend of a cartesian chart, and the footer of its rules under the
 * figure. No legend resolves for a lone series with `legend` unset. A stacked
 * legend holds the series alone. The footer holds its rules out of the aspect
 * box, as a row of chips or as notes (`legend.references.variant`), so they
 * take no height from the plot. A side panel holds the rules in its
 * References section.
 *
 * @internal
 */
function cartesianLegend(chart: CartesianChart): { legend: ReactNode; footer: ReactNode } {
	const { resolvedLegend, legendItems, referenceItems } = chart

	if (!legendItems) return { legend: null, footer: null }

	const panel = legendAside(resolvedLegend.value)

	return {
		legend: (
			<ChartLegend
				items={legendItems}
				references={panel ? referenceItems : undefined}
				referenceVariant={resolvedLegend.referenceVariant}
				hidden={chart.hidden}
				referenceHidden={chart.referenceHidden}
				onToggle={chart.toggleSeries}
				onToggleReference={chart.toggleReference}
				panel={panel}
				maxRows={chart.legendRows}
				texture={chart.tex.active}
				inert={resolvedLegend.inert}
			/>
		),
		footer: !panel && referenceItems.length > 0 && <CartesianLegendFooter chart={chart} />,
	}
}

/**
 * The rules of a stacked legend under the figure: a row of chips, or the notes
 * (`legend.references.variant`).
 *
 * @internal
 */
function CartesianLegendFooter({ chart }: { chart: CartesianChart }) {
	const { resolvedLegend, referenceItems } = chart

	if (resolvedLegend.referenceVariant === 'notes') {
		return (
			<ChartLegendNotes
				references={referenceItems}
				hidden={chart.referenceHidden}
				onToggle={chart.toggleReference}
				inert={resolvedLegend.inert}
			/>
		)
	}

	return (
		<ChartLegendReferences
			references={referenceItems}
			hidden={chart.referenceHidden}
			onToggle={chart.toggleReference}
			inert={resolvedLegend.inert}
		/>
	)
}

/**
 * The frame and the layer stack that every cartesian chart (bar, line, area,
 * combo) shares. It is the {@link ChartFrame} wired to the resolved chart's
 * sizing, tier, cartesian legend, readout, and reference annotations. Inside
 * the plot it draws the texture defs, the axes, the crosshair, the marks, the
 * hit area, the reference rules, and the value labels, in that order. A bar
 * draws its marks before the crosshair, the line charts after.
 *
 * The chart hands in its own props, its marks, and its hit test on the marks.
 * The frame resolves the crosshair, the tooltip, the snap and the keyboard
 * targets, and the reference stops from them. Off the marks, the pointer
 * isolates the snapped stop. Hook-free: the entry component owns every hook, so
 * the frame adds no hook to its order.
 *
 * @internal
 */
export function ChartCartesianFrame({
	chart,
	fullscreen,
	marks,
	markAt,
	crosshair,
	defaultCrosshair,
	crosshairOver = false,
	tooltip,
	animate = false,
	reference,
	snapStops,
	focusStops,
	bars = false,
	labels,
	valueLabels,
	lineHits = false,
	className,
	title,
	subtitle,
	contextMenu,
	...label
}: ChartCartesianFrameProps) {
	const { ref: chartRef, resolvedLegend, tex, orientation } = chart

	const rails = resolveCrosshair(crosshair ?? defaultCrosshair)

	const snapping = crosshairSnaps(rails)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const snap = snapStops ?? { points: chart.snapPoints, series: chart.snapSeries }

	const focus = focusStops ?? snap

	const count = chart.bandPositions.length

	// Placed once: the rules draw them, and the point labels drop where they meet
	// one. A category rule stands its label without the `labels.references`
	// switch. The spark tier draws no label, so it places none.
	const spark = chart.tier === 'spark'

	const standing = Boolean(labels?.references) && !spark

	const withValue = typeof labels?.references !== 'object' || labels.references.value !== false

	// A hidden series drops its labels and its points at once, though the layout
	// holds its place while its marks play their exit.
	const labelled = valueLabels?.list.filter((entry) => !chart.hidden.has(entry.index))

	const points = labelled ? drawnPoints(labelled) : undefined

	const referenceLabels = placeReferenceLabels(
		chart,
		reference,
		{ values: standing, categories: !spark, withValue, listed: chart.listedReferences },
		points,
		labelled && drawnLines(labelled),
	)

	// The value rules that take the keyboard stops: each value rule that carries
	// no standing label.
	const ruleStops = referenceStops(referenceLabels, chart.referencePositions)

	// The hit area reads the marks where a readout, a crosshair, or a band click
	// wants the pointer. It reads the rules wherever a rule takes the pointer, so
	// a rule floats its tooltip with the chart tooltip off.
	const hit = cartesianHit({
		readsMarks: cartesianHitActive(showTooltip, rails, chart.onBandClick, count),
		orientation,
		rules: pointerRules(ruleStops, chart.categoryReferencePositions),
		markAt,
		bars,
		count,
		lineHits,
		lines: labelled,
		snapping,
		snap,
	})

	const marksLayer = (
		<ChartMarksLayer animate={animate} dataKey={chart.dataKey}>
			{marks}
		</ChartMarksLayer>
	)

	return (
		<ChartFrame
			// The entry spreads all its props in, so the rest holds each prop the
			// frame does not name. The frame takes the accessible name alone from it.
			{...(plotName(label) as AccessibleName)}
			title={title}
			subtitle={subtitle}
			contextMenu={contextMenu}
			fullscreen={fullscreen}
			ref={chartRef}
			textHostRef={chart.textHostRef}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserve={chart.reserve}
			fill={chart.fill}
			aspect={chart.outerAspect ?? undefined}
			tier={chart.tier}
			{...cartesianLegend(chart)}
			legendPlacement={resolvedLegend.placement}
			readout={chart.readout}
			readoutOrder={chart.readoutOrder}
			ruleNotes={chart.ruleNotes}
			hidden={chart.hidden}
			seriesCount={chart.metas.length}
			emphasizeMarks
			tooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, snap.points)}
			focus={cartesianFocus(
				chart.bandPositions,
				focus.points,
				orientation,
				ruleStops,
				focus.series,
			)}
			describeReference={(index) => {
				const line = reference?.[index]

				return line ? referenceText(line, chart.formatAxisValue) : null
			}}
			keyboardEmphasis
			onActivate={chart.onBandClick}
			selected={chart.selected}
			orientation={orientation}
			className={className}
			annotations={
				<ChartReferenceList
					reference={reference}
					hidden={chart.referenceHidden}
					format={chart.formatAxisValue}
					formatCategory={chart.formatCategory}
				/>
			}
		>
			{tex.defs}

			<ChartCartesianAxes chart={chart} />

			{crosshairOver && marksLayer}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={snap.points}
					orientation={orientation}
				/>
			)}

			{!crosshairOver && marksLayer}

			{hit && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={hit.count}
					markAt={cartesianTargetAt(hit)}
					orientation={orientation}
					trigger={trigger}
					snaps={snapping}
					onIndexClick={chart.onBandClick}
				/>
			)}

			{/* The rules take no pointer: the hit area resolves them with the lines. */}
			<ChartReferenceLines
				chart={chart}
				reference={reference}
				animate={animate}
				labels={referenceLabels}
				points={points}
			/>

			{/* Last, over the rules, so no rule paints over a label's halo. The labels
			    take no pointer, so the rules keep it. */}
			{labelled && (
				<ChartValueLabels
					labels={cartesianValueLabels(
						chart,
						labels,
						labelled,
						// The drawn series, not the raw metas: on a log axis a value at or below
						// zero is a gap there, so the values align with the drawn points.
						labelled.map(
							(entry) =>
								chart.drawn.find(({ meta }) => meta.index === entry.index)?.meta ?? NO_VALUES,
						),
						referenceLabels?.flatMap((placed) => (placed ? [placed.box] : [])),
					)}
					animate={animate}
					dataKey={chart.dataKey}
				/>
			)}
		</ChartFrame>
	)
}
