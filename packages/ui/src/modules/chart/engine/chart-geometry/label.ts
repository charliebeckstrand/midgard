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
 * to the tooltip (see {@link resolveValueLabels}). Placement measures every
 * label first, and keeps each centered on its own point. One that would
 * overshoot the top or bottom flips to the point's other side, still pinned to
 * its mark. One that would cross a side of the plot anchors inward from its
 * point instead: it starts at the point near the left side, and ends at it
 * near the right. A label never slides past its point, since a slid label
 * lands on the neighboring marks, and one that still does not fit hides.
 * Overlaps resolve
 * by priority: extremes outrank endpoints, and a label whose box meets one
 * already placed is dropped rather than stacked.
 *
 * The standing reference labels place first (see {@link referenceLabels}), by
 * the same rule: each takes the first free spot of a short list beside its
 * rule. A value label whose box meets one drops.
 */

import { TICK_CHAR_WIDTH } from '../chart-constants'
import type { ChartOrientation, PlotRect } from '../chart-orientation'

/** The gap from a point or a rule to its label. @internal */
export const LABEL_OFFSET = 8

/** The collision height of a label, which its flip tests. @internal */
export const LABEL_HEIGHT = 13

/** Half a label's height: the label centers this far past its offset. @internal */
const LABEL_HALF = LABEL_HEIGHT / 2

/** The padding each side of a value label's box. @internal */
const LABEL_PAD = 3

/** The gap between two rows of stacked reference labels. @internal */
export const LABEL_ROW_GAP = 4

/** The step from one row of stacked reference labels to the next. @internal */
const LABEL_ROW_STEP = LABEL_HEIGHT + LABEL_ROW_GAP

/**
 * The y that a label centers on beside a point or a rule at `y`. It takes its
 * preferred side, `above` or below, and flips to the other side where the
 * preferred one would clip the plot. The value labels and the standing
 * reference labels share this flip.
 *
 * @internal
 */
export function labelBesideY(y: number, plot: PlotRect, above: boolean): number {
	const fitsAbove = y - LABEL_OFFSET - LABEL_HEIGHT >= plot.y

	const fitsBelow = y + LABEL_OFFSET + LABEL_HEIGHT <= plot.y + plot.height

	const up = above ? fitsAbove || !fitsBelow : !fitsBelow

	return up ? y - LABEL_OFFSET - LABEL_HALF : y + LABEL_OFFSET + LABEL_HALF
}

/**
 * The value-axis room a chart reserves past its data extremes for the labels:
 * the label's footprint plus slack. That footprint is its offset from the point
 * plus its height, exactly the threshold {@link labelBesideY} flips a clipping
 * label at. The reserved gap therefore sits safely past that threshold, rather
 * than exactly on it. A reservation that only met the threshold would leave
 * every extreme's label on the flip boundary. A resize would dance it across —
 * above, below, above — landing it on the line each time it flips.
 *
 * @internal
 */
const VALUE_LABEL_HEADROOM = LABEL_OFFSET + LABEL_HEIGHT + 4

/** The point-label switches of the `labels` prop, both optional and off by default. @internal */
export type ValueLabelConfig = { endpoints?: boolean; extremes?: boolean }

/**
 * The headroom a chart passes for its point value labels. It is the
 * {@link VALUE_LABEL_HEADROOM} footprint when a single-series chart switches
 * `endpoints` or `extremes` on, and nothing otherwise. Endpoints can sit at the
 * data extremes too, so both switches reserve. That matches the single-series
 * gate in {@link resolveValueLabels}. The layout answers whether the ask was
 * affordable through `valueLabelRoom`; a chart draws the labels only while it
 * holds.
 *
 * @internal
 */
export function valueLabelHeadroom(
	config: ValueLabelConfig | undefined,
	seriesCount: number,
): number {
	const wants = Boolean(config?.endpoints || config?.extremes)

	return wants && seriesCount === 1 ? VALUE_LABEL_HEADROOM : 0
}

/** One plotted point a label can annotate: its position and the value it carries. @internal */
export type ValueLabelPoint = { x: number; y: number; value: number }

/**
 * Pairs a series' rendered points with the values behind them. Two point shapes
 * reach this:
 *
 * - A gap-skipping line (or unstacked area), whose `points` already drop the
 *   null categories. The finite values align one-to-one with them in draw order.
 * - A stacked ribbon's continuous top edge, whose `points` carry one entry per
 *   category, nulls included. Each reads its value straight off `values[index]`,
 *   and a null category takes no label.
 *
 * The point position, not the raw value, sets the label anchor, so a stacked
 * ribbon labels each series at its own edge.
 *
 * @param gapSkipped Whether `points` already dropped the null categories (a
 * line's gap-split geometry) rather than carrying one entry per category (a
 * stacked ribbon's continuous edge).
 * @internal
 */
export function labelPoints(
	values: (number | null)[],
	points: { x: number; y: number }[],
	gapSkipped = true,
): ValueLabelPoint[] {
	if (gapSkipped) {
		const finite = values.filter(
			(value): value is number => value != null && Number.isFinite(value),
		)

		return points.map((point, index) => ({ x: point.x, y: point.y, value: finite[index] ?? 0 }))
	}

	return points.flatMap((point, index) => {
		const value = values[index]

		return value != null && Number.isFinite(value) ? [{ x: point.x, y: point.y, value }] : []
	})
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

/** A candidate label before placement: its point, the side it prefers, and its rank. @internal */
type Candidate = ValueLabelPoint & {
	key: string
	above: boolean
	priority: number
	series: ValueLabelSeries
}

/** An axis-aligned box, for the overlap test. @internal */
export type LabelBox = { x0: number; x1: number; y0: number; y1: number }

/**
 * The endpoint and extreme candidates for one series, de-duped so a point that
 * is both keeps its higher rank. Extremes outrank endpoints; the maximum sits
 * above its point, the minimum below.
 *
 * @internal
 */
function candidatesFor(
	series: ValueLabelSeries,
	order: number,
	endpoints: boolean,
	extremes: boolean,
): Candidate[] {
	const pts = series.points

	if (pts.length === 0) return []

	const byIndex = new Map<number, Candidate>()

	const add = (index: number, priority: number, above: boolean) => {
		const existing = byIndex.get(index)

		if (existing && priority <= existing.priority) return

		byIndex.set(index, {
			...(pts[index] as ValueLabelPoint),
			key: `${order}:${index}`,
			above,
			priority,
			series,
		})
	}

	if (extremes) {
		let maxI = 0

		let minI = 0

		for (let i = 1; i < pts.length; i++) {
			if ((pts[i] as ValueLabelPoint).value > (pts[maxI] as ValueLabelPoint).value) maxI = i

			if ((pts[i] as ValueLabelPoint).value < (pts[minI] as ValueLabelPoint).value) minI = i
		}

		add(maxI, 4, true)

		add(minI, 3, false)
	}

	if (endpoints) {
		add(pts.length - 1, 2, true)

		add(0, 1, true)
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

/**
 * Resolves a candidate to its placed label and collision box, or `null` where
 * it no longer fits. Clipping the top or bottom flips the label to the point's
 * other side, and vertically it never leaves its mark. Across the axis it
 * centers on its point, or anchors inward from the point near a side of the
 * plot ({@link anchorAt}). It never slides past its point, where it would land
 * on the neighboring marks.
 *
 * @internal
 */
function place(
	candidate: Candidate,
	plot: PlotRect,
): { label: PlacedValueLabel; box: LabelBox } | null {
	const text = candidate.series.format(candidate.value)

	const across = anchorAt(candidate.x, labelWidth(text), plot)

	if (!across) return null

	const { anchor, x0, x1 } = across

	const y = labelBesideY(candidate.y, plot, candidate.above)

	return {
		label: {
			key: candidate.key,
			x: candidate.x,
			y,
			text,
			anchor,
			fill: candidate.series.fill,
			color: candidate.series.color,
		},
		box: { x0, x1, y0: y - LABEL_HALF, y1: y + LABEL_HALF },
	}
}

/** The estimated width of a label's box: its text and the padding each side. @internal */
function labelWidth(text: string): number {
	return text.length * TICK_CHAR_WIDTH + 2 * LABEL_PAD
}

/** Two boxes share area. @internal */
function overlaps(a: LabelBox, b: LabelBox): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Places the selective value labels across every series, highest rank first. It
 * drops any that no longer fits its natural spot, and any whose box meets one
 * already placed or an obstacle.
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
		const placement = place(candidate, options.plot)

		if (!placement) continue

		if (placed.some((other) => overlaps(other, placement.box))) continue

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
	gapSkipped = true,
	obstacles: LabelBox[] = [],
): PlacedValueLabel[] {
	if ((!config?.endpoints && !config?.extremes) || list.length !== 1) return []

	return valueLabels({
		series: list.map((entry) => ({
			fill: entry.fill ?? '',
			color: entry.color,
			points: labelPoints(entry.values, entry.points, gapSkipped),
			format: entry.format,
		})),
		plot,
		endpoints: config.endpoints ?? false,
		extremes: config.extremes ?? false,
		obstacles,
	})
}

/**
 * One rule that a standing reference label names: the value-axis position of
 * the rule, or `null` where the rule draws nothing, and the label's text.
 * @internal
 */
export type ReferenceLabelRule = { at: number | null; text: string }

/** A placed reference label: where its text anchors, how it aligns, and its collision box. @internal */
export type PlacedReferenceLabel = {
	x: number
	y: number
	anchor: PlacedValueLabel['anchor']
	box: LabelBox
}

/**
 * The spots a reference label can take beside its rule, in the order it tries
 * them. In a vertical chart, a label sits at the right end of its rule, above
 * the rule and then below it, so every label reads down one side. In a
 * horizontal chart, a label hangs from the top of its rule, centered on it or
 * anchored inward from it near a side ({@link anchorAt}), in the first row
 * down that it fits. The rows stack one label height and {@link LABEL_ROW_GAP}
 * apart, so a crowded label sits just under its neighbor.
 *
 * @internal
 */
function referenceSpots(
	at: number,
	width: number,
	orientation: ChartOrientation,
	plot: PlotRect,
): PlacedReferenceLabel[] {
	if (orientation === 'vertical') {
		if (width > plot.width) return []

		const x = plot.x + plot.width

		return [true, false].map((above) => {
			const y = labelBesideY(at, plot, above)

			return {
				x,
				y,
				anchor: 'end',
				box: { x0: x - width, x1: x, y0: y - LABEL_HALF, y1: y + LABEL_HALF },
			}
		})
	}

	const across = anchorAt(at, width, plot)

	if (!across) return []

	const { anchor, x0, x1 } = across

	const rows = Math.max(
		0,
		Math.floor((plot.height - LABEL_OFFSET + LABEL_ROW_GAP) / LABEL_ROW_STEP),
	)

	return Array.from({ length: rows }, (_, row) => {
		const y = plot.y + LABEL_OFFSET + LABEL_HALF + row * LABEL_ROW_STEP

		return { x: at, y, anchor, box: { x0, x1, y0: y - LABEL_HALF, y1: y + LABEL_HALF } }
	})
}

/**
 * The box that a rule's line takes across the plot: no thickness, so a label
 * box meets it only where the line runs through the label.
 *
 * @internal
 */
function ruleBox(at: number, orientation: ChartOrientation, plot: PlotRect): LabelBox {
	return orientation === 'vertical'
		? { x0: plot.x, x1: plot.x + plot.width, y0: at, y1: at }
		: { x0: at, x1: at, y0: plot.y, y1: plot.y + plot.height }
}

/**
 * Places the standing reference labels, aligned with `rules`, in the order of
 * `rules`. Each label takes the first spot beside its rule
 * ({@link referenceSpots}) whose box meets no label already placed and no
 * other rule. Where every free spot crosses another rule, the label takes the
 * first spot that meets no label, and its halo keeps it legible over the line.
 * A label never leaves its rule, so a label with no free spot is `null`, as is
 * the label of a rule that draws nothing. That rule keeps its hover tooltip and
 * its keyboard stop.
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
): (PlacedReferenceLabel | null)[] {
	const placed: LabelBox[] = []

	const lines = rules.map((rule) => (rule.at === null ? null : ruleBox(rule.at, orientation, plot)))

	return rules.map((rule, index) => {
		if (rule.at === null) return null

		const others = lines.filter((line, other): line is LabelBox => line !== null && other !== index)

		const free = referenceSpots(rule.at, labelWidth(rule.text), orientation, plot).filter(
			(candidate) => !placed.some((other) => overlaps(other, candidate.box)),
		)

		const spot =
			free.find((candidate) => !others.some((line) => overlaps(line, candidate.box))) ?? free[0]

		if (!spot) return null

		placed.push(spot.box)

		return spot
	})
}
