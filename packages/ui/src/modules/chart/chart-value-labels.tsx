'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { TICK_CHAR_WIDTH } from './chart-constants'
import type { PlotRect } from './chart-layout'
import { POINT_POP, POINT_UNPOP, STATIC_GENERATION } from './chart-motion'
import { fillClass, formatChartValue, rawColor, type SeriesPaint } from './chart-series'
import { useChartTier } from './context'

/**
 * Selective value labels for a line-bearing chart's single series: direct
 * labels at its endpoints (first / last point) and extremes (min / max), so a
 * reader gets the numbers without the tooltip. The chart layer only feeds this
 * a lone series — a multi-series plot would crowd its labels between lines with
 * no reliable place to put them, so those charts fall back to the tooltip (see
 * {@link resolveValueLabels}). Placement measures every label first and keeps
 * each centred on its own point: one that would overshoot the top or bottom
 * flips to the point's other side — still pinned to its mark — but one that
 * would have to slide sideways to fit the plot hides instead, since a slid
 * label lands on the neighbouring marks. Overlaps resolve by priority: extremes
 * outrank endpoints, and a label whose box meets one already placed is dropped
 * rather than stacked. The placement is pure and unit-testable; the
 * `ChartValueLabels` component at the foot only draws the result.
 */

/** Gap from a point to its label, the label's collision height, and its box padding. @internal */
const OFFSET = 8
const HEIGHT = 13
const PAD = 3
const HALF = HEIGHT / 2

/**
 * The value-axis room a chart reserves past its data extremes for the labels:
 * the label's footprint (its offset from the point plus its height — exactly
 * the threshold {@link place} flips a clipping label at) plus slack, so the
 * reserved gap sits safely past that threshold rather than exactly on it. A
 * reservation that only met the threshold would leave every extreme's label on
 * the flip boundary, and a resize would dance it across — above, below, above —
 * landing it on the line each time it flips. @internal
 */
export const VALUE_LABEL_HEADROOM = OFFSET + HEIGHT + 4

/**
 * The headroom a chart passes for its point value labels: the
 * {@link VALUE_LABEL_HEADROOM} footprint when a single-series chart switches
 * `endpoints` or `extremes` on — endpoints can sit at the data extremes too, so
 * both switches reserve — and nothing otherwise, matching the single-series
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
 * Pairs a series' rendered points with the values behind them. Two point
 * shapes reach this: a gap-skipping line (or unstacked area), whose `points`
 * already drop the null categories, so the finite values align one-to-one with
 * them in draw order; and a stacked ribbon's continuous top edge, whose
 * `points` carry one entry per category — nulls included — so each reads its
 * value straight off `values[index]` and a null category takes no label. The
 * point position, not the raw value, sets the label anchor, so a stacked ribbon
 * labels each series at its own edge.
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

/** One series' labelable points and the ink its labels take. @internal */
export type ValueLabelSeries = {
	/** The SVG-fill class the labels render in for a slot; empty for a raw colour, which inks inline. */
	fill: string
	/** A raw series colour inked inline on the label's `fill`; unset for a slot. */
	color?: string
	/** Every finite point, in draw order. */
	points: ValueLabelPoint[]
	/** This series' own formatter — its axis's, on a dual-axis chart; the shared one when absent. */
	format?: (value: number) => string
}

/**
 * Builds the label series from a line / area render list and its metas: each
 * series' rendered points paired with its values, inked to match its mark and —
 * where `formats` is given — formatted by its own axis's formatter. Keeps the
 * charts' own bodies flat — they hand this to {@link resolveValueLabels} as the
 * deferred builder.
 *
 * @internal
 */
export function lineLabelSeries(
	list: { paint: SeriesPaint; geometry: { points: { x: number; y: number }[] } }[],
	metas: { values: (number | null)[] }[],
	formats?: ((value: number) => string)[],
	gapSkipped = true,
): ValueLabelSeries[] {
	return list.map((entry, index) => ({
		fill: fillClass(entry.paint) ?? '',
		color: rawColor(entry.paint),
		points: labelPoints(metas[index]?.values ?? [], entry.geometry.points, gapSkipped),
		format: formats?.[index],
	}))
}

/** Options for {@link valueLabels}. @internal */
export type ValueLabelsOptions = {
	series: ValueLabelSeries[]
	plot: PlotRect
	format: (value: number) => string
	/** Label each series' first and last point. */
	endpoints: boolean
	/** Label each series' minimum and maximum point. */
	extremes: boolean
}

/** The `labels` prop's shape — both switches optional and off by default. @internal */
export type ValueLabelConfig = { endpoints?: boolean; extremes?: boolean }

/** A placed label: where its text anchors, what it reads, and its ink. @internal */
export type PlacedValueLabel = {
	x: number
	y: number
	text: string
	anchor: 'start' | 'middle' | 'end'
	fill: string
	/** A raw series colour inked inline on the label's `fill`; unset for a slot. */
	color?: string
}

/** A candidate label before placement: its point, the side it prefers, and its rank. @internal */
type Candidate = {
	x: number
	y: number
	value: number
	above: boolean
	priority: number
	fill: string
	/** A raw series colour inked inline on the label's `fill`; unset for a slot. */
	color?: string
	/** The candidate's own formatter; the shared one when absent. */
	format?: (value: number) => string
}

/** An axis-aligned box, for the overlap test. @internal */
type Box = { x0: number; x1: number; y0: number; y1: number }

/**
 * The endpoint and extreme candidates for one series, de-duped so a point that
 * is both keeps its higher rank. Extremes outrank endpoints; the maximum sits
 * above its point, the minimum below.
 *
 * @internal
 */
function candidatesFor(
	series: ValueLabelSeries,
	endpoints: boolean,
	extremes: boolean,
): Candidate[] {
	const pts = series.points

	if (pts.length === 0) return []

	const byIndex = new Map<number, Candidate>()

	const add = (index: number, priority: number, above: boolean) => {
		const point = pts[index] as ValueLabelPoint

		const existing = byIndex.get(index)

		if (!existing || priority > existing.priority) {
			byIndex.set(index, {
				x: point.x,
				y: point.y,
				value: point.value,
				above,
				priority,
				fill: series.fill,
				color: series.color,
				format: series.format,
			})
		}
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
 * Resolves a candidate to its placed label and collision box, or `null` where
 * it no longer fits. The label stays centred on its own point: clipping the top
 * or bottom flips it to the point's other side — vertically it never leaves its
 * mark — but a box that would cross the plot's sides hides rather than sliding
 * inward, since a slid label lands on the neighbouring marks, which is where a
 * small frame forces it.
 *
 * @internal
 */
function place(
	candidate: Candidate,
	plot: PlotRect,
	format: (value: number) => string,
): { label: PlacedValueLabel; box: Box } | null {
	const text = (candidate.format ?? format)(candidate.value)

	const width = text.length * TICK_CHAR_WIDTH + 2 * PAD

	const [x0, x1] = [candidate.x - width / 2, candidate.x + width / 2]

	if (x0 < plot.x || x1 > plot.x + plot.width) return null

	// Prefer the candidate's side; flip to the other if it would clip top or bottom.
	const above = candidate.y - OFFSET - HEIGHT < plot.y ? false : candidate.above

	const belowClips = candidate.y + OFFSET + HEIGHT > plot.y + plot.height

	const y = above || belowClips ? candidate.y - OFFSET - HALF : candidate.y + OFFSET + HALF

	return {
		label: {
			x: candidate.x,
			y,
			text,
			anchor: 'middle',
			fill: candidate.fill,
			color: candidate.color,
		},
		box: { x0, x1, y0: y - HALF, y1: y + HALF },
	}
}

/** Two boxes share area. @internal */
function overlaps(a: Box, b: Box): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Places the selective value labels across every series, highest rank first,
 * dropping any that no longer fits its natural spot and any whose box meets one
 * already placed.
 *
 * @internal
 */
export function valueLabels(options: ValueLabelsOptions): PlacedValueLabel[] {
	const candidates = options.series
		.flatMap((series) => candidatesFor(series, options.endpoints, options.extremes))
		.sort((a, b) => b.priority - a.priority)

	const placed: Box[] = []

	const labels: PlacedValueLabel[] = []

	for (const candidate of candidates) {
		const placement = place(candidate, options.plot, options.format)

		if (!placement) continue

		if (placed.some((other) => overlaps(other, placement.box))) continue

		placed.push(placement.box)

		labels.push(placement.label)
	}

	return labels
}

/**
 * Gates the labels on the `labels` config and builds them from a line / area
 * render list: an empty (or absent) config draws none, so a chart calls this
 * with one flat statement and keeps its own branching under budget. The series
 * are built only when a label is actually asked for.
 *
 * Point labels are a single-series feature: with more than one labelable series
 * (`list`), the numbers would crowd between the lines with no reliable place to
 * sit, so the labels stand down and the tooltip carries the readout. Reference
 * labels are unaffected — they route through the reference rules, not here.
 *
 * @internal
 */
export function resolveValueLabels(
	config: ValueLabelConfig | undefined,
	list: { paint: SeriesPaint; geometry: { points: { x: number; y: number }[] } }[],
	metas: { values: (number | null)[] }[],
	plot: PlotRect,
	format: ((value: number) => string) | undefined,
	formats?: ((value: number) => string)[],
	gapSkipped = true,
): PlacedValueLabel[] {
	if ((!config?.endpoints && !config?.extremes) || list.length !== 1) return []

	return valueLabels({
		series: lineLabelSeries(list, metas, formats, gapSkipped),
		plot,
		format: format ?? formatChartValue,
		endpoints: config.endpoints ?? false,
		extremes: config.extremes ?? false,
	})
}

/** The value labels' ink: small, semibold, tabular, in the series colour. @internal */
const LABEL_INK = 'text-xs font-semibold tabular-nums'

/**
 * The placed selective value labels, drawn over the marks in each series'
 * colour. Non-interactive — the tooltip and data table own the readout — so the
 * labels never take the pointer. Under `animate` each fades in once its line has
 * drawn, the same beat as the point markers.
 *
 * Self-gating at spark through {@link ChartTierContext}: a sparkline is bare
 * marks, so the endpoint and extreme labels stand down with the rest of the
 * chrome — a chart passes its placed labels through and leaves the tier to the
 * frame.
 *
 * Under `animate` each label fades in once its line has drawn, the same beat as
 * the point markers, and — on a genuine data change — fades out with the
 * outgoing marks before the new labels fade in: the group is keyed by
 * {@link ChartValueLabelsProps.dataKey} inside an `AnimatePresence`, mirroring
 * the marks layer, so the labels transition in step with the data they annotate.
 * A reduced-motion preference pins the key steady, so the new labels swap in
 * place. (The per-label keys are geometry-derived, so a resize already remounts
 * them; the generation key sits above that and only swaps on a data change.)
 *
 * @internal
 */
export type ChartValueLabelsProps = {
	labels: PlacedValueLabel[]
	animate: boolean
	/**
	 * The marks' generation signature — {@link seriesDataKey} — that the
	 * data-change fade swaps on; omitted, the labels never replay on a data change.
	 */
	dataKey?: string
}

export function ChartValueLabels({ labels, animate, dataKey }: ChartValueLabelsProps) {
	const spark = useChartTier() === 'spark'

	// Called unconditionally to keep the hook order stable; only the animated
	// branch reads it.
	const reducedMotion = useReducedMotion()

	if (spark || labels.length === 0) return null

	const content = labels.map((label) => {
		const shared = {
			'data-slot': 'chart-value-label',
			x: label.x,
			y: label.y,
			textAnchor: label.anchor,
			dominantBaseline: 'central' as const,
			// A raw colour inks through the `fill` attribute; a slot omits it and
			// inks through its class.
			fill: label.color,
			className: cn(LABEL_INK, label.fill),
		}

		return animate ? (
			<motion.text
				key={`${label.x}:${label.y}:${label.text}`}
				{...shared}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0, transition: POINT_UNPOP }}
				transition={POINT_POP}
			>
				{label.text}
			</motion.text>
		) : (
			<text key={`${label.x}:${label.y}:${label.text}`} {...shared}>
				{label.text}
			</text>
		)
	})

	if (!animate) {
		return (
			<g data-slot="chart-value-labels" pointerEvents="none">
				{content}
			</g>
		)
	}

	// A reduced-motion preference holds the generation steady, so a data change
	// reconciles the labels in place rather than fading out-then-in.
	const generation = reducedMotion ? STATIC_GENERATION : (dataKey ?? STATIC_GENERATION)

	return (
		<ReducedMotion>
			<AnimatePresence mode="wait">
				<motion.g key={generation} data-slot="chart-value-labels" pointerEvents="none">
					{content}
				</motion.g>
			</AnimatePresence>
		</ReducedMotion>
	)
}
