/**
 * Pure placement of the labels that a chart draws beside its marks and its
 * rules: the selective value labels of a line-bearing chart's single series
 * (its endpoints and its extremes), and the standing reference labels.
 * Independent of React and styling, so the placement is unit-testable in
 * isolation.
 *
 * A reader gets the numbers without the tooltip. The chart layer only feeds
 * the value labels a lone series. A multi-series plot would crowd its labels
 * between lines with no reliable place to put them, so those charts fall back
 * to the tooltip (see {@link resolveValueLabels}). Placement estimates the
 * width of every label first, and keeps each centered on its own point. One
 * that would cross a side of the plot anchors inward from its point instead: it
 * starts at the point near the left side, and ends at it near the right. A
 * label never slides past its point, since a slid label lands on the
 * neighboring marks.
 *
 * A label at the maximum or the minimum of its series finds its room on the
 * outward side of its point, where no part of the line can be: centered past
 * the point, and then level with the point on its right or its left (see
 * {@link extremeSpots}). The value axis keeps room for it only where the
 * extreme sits too close to its edge ({@link valueLabelHeadroom}). A label with
 * no free spot hides. An endpoint takes its preferred side, and
 * flips to the other side where the preferred one would clip the plot.
 * Overlaps resolve by priority: extremes outrank endpoints, and a label whose
 * box meets one already placed takes its next spot, or is dropped rather than
 * stacked.
 *
 * The standing reference labels place first (see {@link referenceLabels}). Each
 * takes the most open free spot of a short list on its rule, clear of the data,
 * the other rules, and the other labels where it can. A value label whose box
 * meets one drops.
 */

import { LABEL_GAP, LABEL_ROOM, MARKER_REACH, TICK_CHAR_WIDTH } from '../chart-constants'
import { type ChartOrientation, type PlotRect, type Vec, valueRule } from '../chart-orientation'
import type { ValueHeadroom } from '../chart-scale'

/** The collision height of a label, which its flip tests. @internal */
export const LABEL_HEIGHT = 13

/** Half a label's height: the label centers this far past its offset. @internal */
const LABEL_HALF = LABEL_HEIGHT / 2

/** The padding each side of a value label's box. @internal */
const LABEL_PAD = 3

/**
 * The gap from a point to the near side of the box of a label level with it:
 * the reach of the marker ring, so the box clears the marker. The text starts
 * {@link LABEL_PAD} further out.
 *
 * @internal
 */
const MARKER_CLEARANCE = MARKER_REACH

/**
 * The y that a value label centers on beside a point at `y`. It takes its
 * preferred side, `above` or below, and flips to the other side where the
 * preferred one would clip the plot. The endpoint labels share this flip.
 *
 * @internal
 */
export function labelBesideY(y: number, plot: PlotRect, above: boolean): number {
	const fitsAbove = y - LABEL_ROOM - LABEL_HEIGHT >= plot.y

	const fitsBelow = y + LABEL_ROOM + LABEL_HEIGHT <= plot.y + plot.height

	const up = above ? fitsAbove || !fitsBelow : !fitsBelow

	return up ? y - LABEL_ROOM - LABEL_HALF : y + LABEL_ROOM + LABEL_HALF
}

/** One pixel past the fit threshold of a label, so that rounding never leaves the label exactly on it. @internal */
const LABEL_SLACK = 1

/**
 * The value-axis room a chart keeps past its data extremes for the labels.
 * Past the peak, it is the footprint of a label centered above the point: its
 * offset and its height. Past the trough, it is only the height of a label
 * level with the point ({@link extremeSpots}), since the floor widens by whole
 * steps. Each adds the {@link LABEL_GAP} and {@link LABEL_SLACK}. A room that only met the fit threshold
 * would leave the label on that threshold, and a resize would move it from
 * spot to spot.
 *
 * @internal
 */
const VALUE_LABEL_HEADROOM: ValueHeadroom = {
	ceiling: LABEL_ROOM + LABEL_HEIGHT + LABEL_GAP + LABEL_SLACK,
	floor: LABEL_HEIGHT + LABEL_GAP + LABEL_SLACK,
}

/** The point-label switches of the `labels` prop, both optional and off by default. @internal */
export type ValueLabelConfig = { endpoints?: boolean; extremes?: boolean }

/**
 * The headroom a chart passes for its point value labels:
 * {@link VALUE_LABEL_HEADROOM} when a single-series chart switches `endpoints`
 * or `extremes` on, else `undefined`. Endpoints can sit at the data extremes
 * too, so both switches reserve. That matches the single-series gate in
 * {@link resolveValueLabels}.
 *
 * @internal
 */
export function valueLabelHeadroom(
	config: ValueLabelConfig | undefined,
	seriesCount: number,
): ValueHeadroom | undefined {
	const wants = Boolean(config?.endpoints || config?.extremes)

	return wants && seriesCount === 1 ? VALUE_LABEL_HEADROOM : undefined
}

/** One plotted point a label can annotate: its position and the value it carries. @internal */
export type ValueLabelPoint = { x: number; y: number; value: number }

/**
 * Pairs a series' rendered points with the values behind them. The points
 * already drop the null categories, so the finite values align one-to-one with
 * them in draw order. The point position, not the raw value, sets the label
 * anchor, so a stacked ribbon labels each series at its own edge.
 *
 * @internal
 */
export function labelPoints(
	values: (number | null)[],
	points: { x: number; y: number }[],
): ValueLabelPoint[] {
	const finite = values.filter((value): value is number => value != null && Number.isFinite(value))

	return points.map((point, index) => ({ x: point.x, y: point.y, value: finite[index] ?? 0 }))
}

/** One series' labelable points, the ink its labels take, and its formatter. @internal */
export type ValueLabelSeries = {
	/** The SVG-fill class the labels render in for a slot; empty for a raw color, which inks inline. */
	fill: string
	/** A raw series color inked inline on the label's `fill`; unset for a slot. */
	color?: string
	/** Every finite point, in draw order. */
	points: ValueLabelPoint[]
	/** This series' own formatter: its axis's, on a dual-axis chart. */
	format: (value: number) => string
}

/** Options for {@link valueLabels}. @internal */
export type ValueLabelsOptions = {
	series: ValueLabelSeries[]
	plot: PlotRect
	/** Label each series' first and last point. */
	endpoints: boolean
	/** Label each series' minimum and maximum point. */
	extremes: boolean
	/**
	 * The boxes of the labels that placed first: the standing reference labels.
	 * A value label whose box meets one drops.
	 */
	obstacles?: LabelBox[]
}

/** A placed label: where its text anchors, what it reads, and its ink. @internal */
export type PlacedValueLabel = {
	/**
	 * The series and point the label annotates. It holds through a resize, so an
	 * animated label keeps its node while its position moves.
	 */
	key: string
	x: number
	y: number
	text: string
	anchor: 'start' | 'middle' | 'end'
	fill: string
	/** A raw series color inked inline on the label's `fill`; unset for a slot. */
	color?: string
}

/**
 * A candidate label before placement: its point, the side it prefers, its
 * rank, and whether its point is at the maximum or the minimum of its series.
 * @internal
 */
type Candidate = ValueLabelPoint & {
	key: string
	above: boolean
	priority: number
	extreme: boolean
	series: ValueLabelSeries
}

/** An axis-aligned box, for the overlap test. @internal */
export type LabelBox = { x0: number; x1: number; y0: number; y1: number }

/**
 * The endpoint and extreme candidates for one series, de-duped so a point that
 * is both keeps its higher rank. Extremes outrank endpoints. A point at the
 * maximum or the minimum value of the series, an endpoint too, has no line past
 * it, so its label takes the outward spots ({@link extremeSpots}): above the
 * maximum, below the minimum. Any other endpoint prefers the side above.
 *
 * @internal
 */
function candidatesFor(
	series: ValueLabelSeries,
	order: number,
	endpoints: boolean,
	extremes: boolean,
): Candidate[] {
	const points = series.points

	if (points.length === 0) return []

	let maxIndex = 0

	let minIndex = 0

	for (let i = 1; i < points.length; i++) {
		const value = (points[i] as ValueLabelPoint).value

		if (value > (points[maxIndex] as ValueLabelPoint).value) maxIndex = i

		if (value < (points[minIndex] as ValueLabelPoint).value) minIndex = i
	}

	const max = (points[maxIndex] as ValueLabelPoint).value

	const min = (points[minIndex] as ValueLabelPoint).value

	const byIndex = new Map<number, Candidate>()

	const add = (index: number, priority: number) => {
		const existing = byIndex.get(index)

		if (existing && priority <= existing.priority) return

		const point = points[index] as ValueLabelPoint

		const trough = point.value === min && point.value !== max

		byIndex.set(index, {
			...point,
			key: `${order}:${index}`,
			above: !trough,
			priority,
			extreme: trough || point.value === max,
			series,
		})
	}

	if (extremes) {
		add(maxIndex, 4)

		add(minIndex, 3)
	}

	if (endpoints) {
		add(points.length - 1, 2)

		add(0, 1)
	}

	return [...byIndex.values()]
}

/**
 * The anchor of a label `width` wide at `x`, and its box across the axis: centered
 * on the point where that fits the plot, else anchored inward from the point,
 * else `null`. The box keeps {@link LABEL_PAD} past the point on the anchored
 * side, for the overlap test. That padding can cross the plot side; the text
 * itself stays inside.
 *
 * @internal
 */
function anchorAt(
	x: number,
	width: number,
	plot: PlotRect,
): { anchor: PlacedValueLabel['anchor']; x0: number; x1: number } | null {
	const [left, right] = [plot.x, plot.x + plot.width]

	if (x - width / 2 >= left && x + width / 2 <= right) {
		return { anchor: 'middle', x0: x - width / 2, x1: x + width / 2 }
	}

	// A label near the left side starts at its point; any other ends at it.
	const start = x - width / 2 < left

	const x0 = start ? x - LABEL_PAD : x + LABEL_PAD - width

	const x1 = x0 + width

	// Only the far side can clip the text. The padding on the anchored side is
	// spacing for the overlap test, and a point near the side keeps its label.
	return (start ? x1 > right : x0 < left) ? null : { anchor: start ? 'start' : 'end', x0, x1 }
}

/** A placed label and its collision box. @internal */
type Placement = { label: PlacedValueLabel; box: LabelBox }

/** A spot a label can take: where its text anchors, and its box across the axis. @internal */
type Spot = { x: number; y: number; anchor: PlacedValueLabel['anchor']; x0: number; x1: number }

/**
 * Whether the label of an extreme centered on `y` fits between the top and the
 * bottom of the plot, {@link LABEL_GAP} clear of each.
 *
 * @internal
 */
function fitsAcross(y: number, plot: PlotRect): boolean {
	return y - LABEL_HALF - LABEL_GAP >= plot.y && y + LABEL_HALF + LABEL_GAP <= plot.y + plot.height
}

/**
 * The spots an extreme's label can take, in the order it tries them. Each is
 * on the outward side of the point: above the maximum, below the minimum. No
 * value of the series is past the extreme, and a segment between two points
 * stays between them, so no part of the line enters these spots. The first
 * spot centers past the point, {@link LABEL_ROOM} away. The next two sit
 * level with the point, one edge on its line, clear of the marker: to its
 * right, then to its left. A spot that would cross a side of the plot, or
 * come within {@link LABEL_GAP} of its top or its bottom, is left out.
 *
 * @internal
 */
function extremeSpots(candidate: Candidate, width: number, plot: PlotRect): Spot[] {
	const { x, y, above } = candidate

	const outward = above ? -1 : 1

	const spots: Spot[] = []

	const past = y + outward * (LABEL_ROOM + LABEL_HALF)

	const across = anchorAt(x, width, plot)

	if (across && fitsAcross(past, plot)) spots.push({ x, y: past, ...across })

	const level = y + outward * LABEL_HALF

	if (!fitsAcross(level, plot)) return spots

	const right = x + MARKER_CLEARANCE

	if (right + width <= plot.x + plot.width) {
		spots.push({ x: right + LABEL_PAD, y: level, anchor: 'start', x0: right, x1: right + width })
	}

	const left = x - MARKER_CLEARANCE

	if (left - width >= plot.x) {
		spots.push({ x: left - LABEL_PAD, y: level, anchor: 'end', x0: left - width, x1: left })
	}

	return spots
}

/**
 * The placements a candidate can take, in the order it tries them. An extreme
 * tries its outward spots ({@link extremeSpots}). An endpoint takes one spot:
 * centered on its point, or anchored inward from the point near a side of the
 * plot ({@link anchorAt}), on its preferred side, or on the other side where
 * the preferred one would clip the plot.
 *
 * @internal
 */
function placements(candidate: Candidate, plot: PlotRect): Placement[] {
	const text = candidate.series.format(candidate.value)

	const width = labelWidth(text)

	const spots: Spot[] = candidate.extreme
		? extremeSpots(candidate, width, plot)
		: [anchorAt(candidate.x, width, plot)]
				.filter((across) => across !== null)
				.map((across) => ({
					x: candidate.x,
					y: labelBesideY(candidate.y, plot, candidate.above),
					...across,
				}))

	return spots.map(({ x, y, anchor, x0, x1 }) => ({
		label: {
			key: candidate.key,
			x,
			y,
			text,
			anchor,
			fill: candidate.series.fill,
			color: candidate.series.color,
		},
		box: labelBox(x0, x1, y),
	}))
}

/** The estimated width of a label's box: its text and the padding each side. @internal */
function labelWidth(text: string): number {
	return text.length * TICK_CHAR_WIDTH + 2 * LABEL_PAD
}

/** The box of a label that spans `x0` to `x1` and centers on `y`. @internal */
function labelBox(x0: number, x1: number, y: number): LabelBox {
	return { x0, x1, y0: y - LABEL_HALF, y1: y + LABEL_HALF }
}

/** The box of a drawn point marker, its ring included. @internal */
export function markerBox(point: { x: number; y: number }): LabelBox {
	return {
		x0: point.x - MARKER_REACH,
		x1: point.x + MARKER_REACH,
		y0: point.y - MARKER_REACH,
		y1: point.y + MARKER_REACH,
	}
}

/** Two boxes share area. @internal */
function overlaps(a: LabelBox, b: LabelBox): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Places the selective value labels across every series, highest rank first.
 * Each label takes the first of its {@link placements} whose box meets no label
 * already placed and no obstacle. A label with no such spot drops.
 *
 * @internal
 */
export function valueLabels(options: ValueLabelsOptions): PlacedValueLabel[] {
	const candidates = options.series
		.flatMap((series, order) => candidatesFor(series, order, options.endpoints, options.extremes))
		.sort((a, b) => b.priority - a.priority)

	const placed: LabelBox[] = [...(options.obstacles ?? [])]

	const labels: PlacedValueLabel[] = []

	for (const candidate of candidates) {
		const placement = placements(candidate, options.plot).find(
			(spot) => !placed.some((other) => overlaps(other, spot.box)),
		)

		if (!placement) continue

		placed.push(placement.box)

		labels.push(placement.label)
	}

	return labels
}

/** A render series that point labels can read: its paint projections and its drawn points. @internal */
export type LabelableSeries = {
	/** The SVG-fill class of the series, or `undefined` for a raw color. */
	fill: string | undefined
	/** A raw series color, or `undefined` for a slot. */
	color: string | undefined
	/** The drawn points of the series. */
	points: { x: number; y: number }[]
	/** The values behind the points. */
	values: (number | null)[]
	/** The formatter of the axis the series reads against. */
	format: (value: number) => string
}

/**
 * Gates the labels on the `labels` config, and places them for a line or area
 * render list. An empty (or absent) config draws none. The series are built
 * only when a label is asked for.
 *
 * Point labels are a single-series feature. With more than one labelable
 * series, the numbers would crowd between the lines with no reliable place to
 * sit. The labels therefore stand down, and the tooltip carries the readout.
 * Reference labels are unaffected: they route through the reference rules.
 * Their boxes arrive as `obstacles`, and a value label that meets one drops.
 *
 * @internal
 */
export function resolveValueLabels(
	config: ValueLabelConfig | undefined,
	list: LabelableSeries[],
	plot: PlotRect,
	obstacles?: LabelBox[],
): PlacedValueLabel[] {
	if ((!config?.endpoints && !config?.extremes) || list.length !== 1) return []

	return valueLabels({
		series: list.map((entry) => ({
			fill: entry.fill ?? '',
			color: entry.color,
			points: labelPoints(entry.values, entry.points),
			format: entry.format,
		})),
		plot,
		endpoints: config.endpoints ?? false,
		extremes: config.extremes ?? false,
		obstacles,
	})
}

/**
 * One rule that a standing reference label names: the position of the rule,
 * or `null` where the rule draws nothing, and the drawn width of the label's
 * text. A category
 * rule sets `orientation` to the facing whose value rule it draws as
 * ({@link crossOrientation}). Omitted, the rule is a value rule of the chart.
 * A rule that draws but shows no label sets `unlabeled`: it takes no label,
 * and its line stays an obstacle to the other labels.
 * @internal
 */
export type ReferenceLabelRule = {
	at: number | null
	width: number
	orientation?: ChartOrientation
	unlabeled?: boolean
}

/**
 * A placed reference label: where its text anchors, how it aligns, the drawn
 * width of its text, and its collision box, which pads the text on each side.
 * @internal
 */
export type PlacedReferenceLabel = {
	x: number
	y: number
	anchor: PlacedValueLabel['anchor']
	width: number
	box: LabelBox
}

/**
 * The spots a reference label can take on its rule, in the order it tries
 * them. A label centers on its rule, and the rule breaks for it, so the label
 * names only the rule that it interrupts. In a vertical chart, a label sits at
 * the right end of its rule, and then at the left end. Each end label is flush
 * with its side of the plot, so the rule stops at the label and does not show
 * a short dash past it. In a horizontal chart, a label sits on the rule at a
 * height in the plot. The heights step one unit apart, down from the top of
 * the plot, so a label can keep exactly {@link LABEL_ROOM} from a thing beside
 * it. At each height, the label centers on the rule, or ends or starts at it
 * ({@link ruleAnchors}).
 *
 * @internal
 */
function referenceSpots(
	at: number,
	width: number,
	orientation: ChartOrientation,
	plot: PlotRect,
): PlacedReferenceLabel[] {
	const padded = width + 2 * LABEL_PAD

	if (orientation === 'vertical') {
		if (padded > plot.width) return []

		const left = plot.x

		const right = plot.x + plot.width

		return [
			{ x: right, y: at, anchor: 'end', width, box: labelBox(right - padded, right, at) },
			{ x: left, y: at, anchor: 'start', width, box: labelBox(left, left + padded, at) },
		]
	}

	const anchors = ruleAnchors(at, padded, plot)

	const rows = plot.height < LABEL_HEIGHT ? 0 : Math.floor(plot.height - LABEL_HEIGHT) + 1

	return Array.from({ length: rows }, (_, row) => {
		const y = plot.y + LABEL_HALF + row

		return anchors.map(({ anchor, x0, x1 }) => ({
			x: at,
			y,
			anchor,
			width,
			box: labelBox(x0, x1, y),
		}))
	}).flat()
}

/**
 * The ways that a label `width` wide can align on a vertical rule at `at`,
 * in the order it tries them: centered on the rule, then ending at the rule,
 * then starting at it. Each one keeps its text inside the plot. A label that
 * ends or starts at its rule leaves the rule beside it, so it can step off a
 * neighbor rule that a centered label covers. Each box keeps
 * {@link LABEL_PAD} past the rule on the anchored side.
 *
 * @internal
 */
function ruleAnchors(
	at: number,
	width: number,
	plot: PlotRect,
): { anchor: PlacedValueLabel['anchor']; x0: number; x1: number }[] {
	const [left, right] = [plot.x, plot.x + plot.width]

	const middle = { anchor: 'middle' as const, x0: at - width / 2, x1: at + width / 2 }

	const end = { anchor: 'end' as const, x0: at + LABEL_PAD - width, x1: at + LABEL_PAD }

	const start = { anchor: 'start' as const, x0: at - LABEL_PAD, x1: at - LABEL_PAD + width }

	return [
		...(middle.x0 >= left && middle.x1 <= right ? [middle] : []),
		...(end.x0 >= left ? [end] : []),
		...(start.x1 <= right ? [start] : []),
	]
}

/**
 * The box of a rule's drawn line ({@link valueRule}): no thickness, so a label
 * box meets it only where the line runs through the label.
 *
 * @internal
 */
function ruleBox(at: number, orientation: ChartOrientation, plot: PlotRect): LabelBox {
	const { from, to } = valueRule(orientation, plot, at)

	return { x0: from.x, x1: to.x, y0: from.y, y1: to.y }
}

/**
 * The drawn data that a reference label keeps clear of: the point markers, and
 * the lines of the series.
 * @internal
 */
export type ReferenceLabelMarks = {
	/** The box of each drawn point marker ({@link markerBox}). */
	markers?: readonly LabelBox[]
	/** Each drawn line run of a series. */
	lines?: readonly LabelLine[]
}

/**
 * One drawn line run: its points in draw order, and whether it curves between
 * them. A curve is monotone, so it stays inside the box of each two neighbor
 * points.
 * @internal
 */
export type LabelLine = { points: readonly Vec[]; smooth: boolean }

/**
 * The clear space between boxes `a` and `b` along the axis that parts them
 * most, or less than zero where they share area. A rule's line is a box with
 * no thickness ({@link ruleBox}).
 * @internal
 */
function clearance(a: LabelBox, b: LabelBox): number {
	return Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1)
}

/** A span of y, from its low end to its high end. @internal */
type Span = readonly [number, number]

/**
 * The drawn data in one column of the plot: for each point marker and each
 * line run that enters the column, the span of y that it covers there. A box
 * that spans the column meets a mark where its own span of y meets a span of
 * the mark. Each label anchor has one column, so a label tests its heights
 * against a few spans, not against every segment of the data. The markers keep
 * the low ends and the high ends of their spans apart, each in order, so a
 * count of the markers that meet a box is two binary searches.
 * @internal
 */
type DataColumn = { lows: number[]; highs: number[]; lines: Span[][] }

/**
 * The span of y that the segment from `p` to `q` covers between `x0` and
 * `x1`, or `null` where it does not enter them. A straight segment is clipped
 * to the column. A curve covers the box of its two points, which holds a
 * monotone curve.
 * @internal
 */
function segmentSpan(p: Vec, q: Vec, x0: number, x1: number, smooth: boolean): Span | null {
	const lo = Math.min(p.x, q.x)

	const hi = Math.max(p.x, q.x)

	if (hi < x0 || lo > x1) return null

	if (smooth || p.x === q.x) return [Math.min(p.y, q.y), Math.max(p.y, q.y)]

	const at = (x: number) => p.y + ((x - p.x) * (q.y - p.y)) / (q.x - p.x)

	const a = at(Math.max(lo, x0))

	const b = at(Math.min(hi, x1))

	return [Math.min(a, b), Math.max(a, b)]
}

/** Spans in order of their low ends, with each overlap joined into one span. @internal */
function joinSpans(spans: Span[]): Span[] {
	const joined: [number, number][] = []

	for (const [lo, hi] of [...spans].sort((a, b) => a[0] - b[0])) {
		const last = joined.at(-1)

		if (last && lo <= last[1]) last[1] = Math.max(last[1], hi)
		else joined.push([lo, hi])
	}

	return joined
}

/**
 * The drawn data in the column from `x0` to `x1`, which `reach` widens on
 * each side ({@link DataColumn}).
 * @internal
 */
function dataColumn(
	x0: number,
	x1: number,
	reach: number,
	markers: readonly LabelBox[],
	lines: readonly LabelLine[],
): DataColumn {
	const [left, right] = [x0 - reach, x1 + reach]

	const runs = lines.map((line) => {
		const spans: Span[] = []

		for (let i = 1; i < line.points.length; i++) {
			const span = segmentSpan(
				line.points[i - 1] as Vec,
				line.points[i] as Vec,
				left,
				right,
				line.smooth,
			)

			if (span) spans.push(span)
		}

		return joinSpans(spans)
	})

	const inside = markers.filter((marker) => marker.x0 <= right && left <= marker.x1)

	return {
		lows: inside.map((marker) => marker.y0).sort((a, b) => a - b),
		highs: inside.map((marker) => marker.y1).sort((a, b) => a - b),
		lines: runs.filter((spans) => spans.length > 0),
	}
}

/**
 * The count of the values of `sorted`, in order, that are less than `value`,
 * or also equal to it where `inclusive`.
 * @internal
 */
function countBelow(sorted: readonly number[], value: number, inclusive = false): number {
	let lo = 0

	let hi = sorted.length

	while (lo < hi) {
		const mid = (lo + hi) >> 1

		const at = sorted[mid] as number

		if (at < value || (inclusive && at === value)) lo = mid + 1
		else hi = mid
	}

	return lo
}

/** Whether `span` comes within `reach` of the span of `box` across y. The test is inclusive. @internal */
function spanMeets(span: Span, box: LabelBox, reach: number): boolean {
	return span[0] <= box.y1 + reach && box.y0 - reach <= span[1]
}

/** The count of the data marks of `column` that come within `reach` of `box`. @internal */
function marksMet(column: DataColumn, box: LabelBox, reach: number): number {
	const { lows, highs } = column

	// A marker misses the box where its span starts past the box, or ends short of it.
	const past = lows.length - countBelow(lows, box.y1 + reach, true)

	const short = countBelow(highs, box.y0 - reach)

	return (
		lows.length -
		past -
		short +
		count(column.lines, (spans) => spans.some((span) => spanMeets(span, box, reach)))
	)
}

/**
 * What a reference label keeps clear of: the drawn data, the other rules, and
 * the boxes that it keeps room from, the labels already placed and the top and
 * bottom edges of the plot.
 * @internal
 */
type LabelScene = {
	/** The drawn data in the column of a box, which `reach` widens ({@link dataColumn}). */
	column: (box: LabelBox, reach: number) => DataColumn
	rules: readonly LabelBox[]
	labels: readonly LabelBox[]
}

/**
 * A thing that a box crosses: within {@link LABEL_GAP} of it. The test is
 * inclusive, as the test of a rule break is: a rule just at the gap breaks.
 * @internal
 */
function crosses(thing: LabelBox, box: LabelBox): boolean {
	return clearance(thing, box) <= LABEL_GAP
}

/** A thing that crowds a box: past {@link LABEL_GAP} of it, but short of {@link LABEL_ROOM}. @internal */
function crowds(thing: LabelBox, box: LabelBox): boolean {
	const space = clearance(thing, box)

	return space > LABEL_GAP && space < LABEL_ROOM
}

/** The count of the items of `list` that `test` holds for. @internal */
function count<T>(list: readonly T[], test: (item: T) => boolean): number {
	let total = 0

	for (const item of list) if (test(item)) total++

	return total
}

/**
 * How much a spot covers, in order of weight: the count of the data marks that
 * it crosses, of the other rules that it crosses, and of the things that crowd
 * it. A data mark is a point marker or a line run. A lower cost is a more open
 * spot ({@link lessCost}).
 * @internal
 */
function spotCost(box: LabelBox, scene: LabelScene): [number, number, number] {
	const crossed = marksMet(scene.column(box, LABEL_GAP), box, LABEL_GAP)

	// A mark within the room that it does not cross crowds the box.
	const crowded =
		marksMet(scene.column(box, LABEL_ROOM), box, LABEL_ROOM) -
		crossed +
		count(scene.rules, (line) => crowds(line, box)) +
		count(scene.labels, (other) => clearance(other, box) < LABEL_ROOM)

	return [crossed, count(scene.rules, (line) => crosses(line, box)), crowded]
}

/** Cost `a` is less than cost `b`: the first term that differs decides. @internal */
function lessCost(a: readonly number[], b: readonly number[]): boolean {
	for (let i = 0; i < a.length; i++) {
		if ((a[i] as number) !== (b[i] as number)) return (a[i] as number) < (b[i] as number)
	}

	return false
}

/** The spot of least cost ({@link spotCost}), the first of a tie, or `undefined` for no spot. @internal */
function mostOpen(
	spots: PlacedReferenceLabel[],
	scene: LabelScene,
): PlacedReferenceLabel | undefined {
	let best: PlacedReferenceLabel | undefined

	let least: number[] | undefined

	for (const spot of spots) {
		const cost = spotCost(spot.box, scene)

		if (!least || lessCost(cost, least)) {
			best = spot

			least = cost
		}

		if (cost.every((term) => term === 0)) break
	}

	return best
}

/**
 * Places the standing reference labels, aligned with `rules`, in the order of
 * `rules`. Each label takes a spot on its rule ({@link referenceSpots}) that
 * keeps {@link LABEL_GAP} clear of each label already placed. Of those spots,
 * it takes the most open, and the order of the spots breaks a tie
 * ({@link spotCost}). First, the fewer data marks of `marks` that a spot
 * crosses (comes within the gap of), the more open it is. Next, the fewer
 * other rules that it crosses, because a rule that near breaks for the label.
 * Last, the fewer things inside {@link LABEL_ROOM} of it: the data marks, the
 * other rules, the labels already placed, and the top and bottom edges of the
 * plot.
 * A label never leaves its rule, so a label with no free spot is `null`, as is
 * the label of a rule that draws nothing or is `unlabeled`. That rule keeps its
 * hover tooltip and its keyboard stop. Every rule that draws is an obstacle,
 * also an `unlabeled` rule.
 *
 * The value labels place after these and treat the boxes as obstacles
 * ({@link resolveValueLabels}): a value label that meets one drops.
 *
 * @internal
 */
export function referenceLabels(
	rules: ReferenceLabelRule[],
	orientation: ChartOrientation,
	plot: PlotRect,
	marks: ReferenceLabelMarks = {},
): (PlacedReferenceLabel | null)[] {
	const placed: LabelBox[] = []

	const markers = marks.markers ?? []

	const lines = marks.lines ?? []

	// The top and bottom edges of the plot, which an open spot keeps room from.
	const edges: LabelBox[] = [plot.y, plot.y + plot.height].map((y) => ({
		x0: plot.x,
		x1: plot.x + plot.width,
		y0: y,
		y1: y,
	}))

	// One column for each label anchor and reach, built on its first use.
	const columns = new Map<string, DataColumn>()

	const column = (box: LabelBox, reach: number) => {
		const key = `${box.x0} ${box.x1} ${reach}`

		let found = columns.get(key)

		if (!found) {
			found = dataColumn(box.x0, box.x1, reach, markers, lines)

			columns.set(key, found)
		}

		return found
	}

	const drawnRules = rules.map((rule) =>
		rule.at === null ? null : ruleBox(rule.at, rule.orientation ?? orientation, plot),
	)

	return rules.map((rule, index) => {
		if (rule.at === null || rule.unlabeled) return null

		const scene: LabelScene = {
			column,
			rules: drawnRules.filter((line, other): line is LabelBox => other !== index && line !== null),
			labels: [...edges, ...placed],
		}

		const spot = mostOpen(
			referenceSpots(rule.at, rule.width, rule.orientation ?? orientation, plot).filter(
				(candidate) => !placed.some((other) => clearance(other, candidate.box) < LABEL_GAP),
			),
			scene,
		)

		if (!spot) return null

		placed.push(spot.box)

		return spot
	})
}
