/**
 * The value axes of a cartesian chart: the domain inputs, the formatters, and
 * the title of each value axis, the grid positions, and the value-axis position
 * of each reference line. It holds no React, so the axis math is unit-testable
 * in isolation.
 */

import { compactFormat, fractionFormat } from '../../../../utilities'
import type { CartesianAxes, ChartValueAxisId } from '../chart-axes/schema'
import type { CartesianLayout, ChartValueAxisInput } from '../chart-layout'
import type { ChartReferenceLine } from '../chart-reference-lines'
import { bandBoundaries, type LinearScale } from '../chart-scale'
import type { SeriesMeta } from '../chart-series'
import type { CartesianChartProps } from '../types'
import { type StackMode, stackEdges } from './stack'

/**
 * One axis's domain candidates: its visible series' values, plus the reference
 * values bound to it. Where stacked, those values are the per-category stack
 * sums. The references fold in the way min / max pins do, so an off-data target
 * line stays inside the frame.
 * A reference toggled off through its chip drops out with the series switched
 * off beside it, so the axis rescales to what is still drawn.
 *
 * @internal
 */
function domainValuesFor<T>(args: {
	axis: ChartValueAxisId
	visible: SeriesMeta[]
	stack: StackMode
	data: T[]
	reference: ChartReferenceLine[] | undefined
	referenceHidden: ReadonlySet<number>
}): number[] {
	const { axis, visible, stack, data, reference, referenceHidden } = args

	const bound = visible.filter((meta) => meta.axis === axis)

	// Stacked charts scale to the edges their columns draw; every other chart
	// scales to the individual values. One array takes each value and reference,
	// with no copy for each series.
	const values = stack && bound.length > 0 ? stackEdges(bound, data.length, stack) : []

	if (!stack) {
		for (const meta of bound) {
			for (const value of meta.values) if (value !== null) values.push(value)
		}
	}

	reference?.forEach((line, index) => {
		if ((line.axis ?? 'y') === axis && !referenceHidden.has(index)) values.push(line.value)
	})

	return values
}

/** The per-axis formatters and layout inputs resolved from the chart props. @internal */
export type ResolvedValueAxes = {
	value?: ChartValueAxisInput
	value2?: ChartValueAxisInput
	/** The category axis's title, gated on the tier affording a title band. */
	bandTitle?: string
	formatAxisValue: (value: number, axis: ChartValueAxisId) => string
}

/** One axis's tick and readout formatters. @internal */
type AxisFormatters = {
	/** The value gutter's labels — the compact default in a narrow frame. */
	tick: (value: number) => string
	/** The tooltip, hidden table, and reference rules — always full precision. */
	readout: (value: number) => string
}

/**
 * One axis's tick and readout formatters. An explicit per-axis or chart `format`
 * wins for both. Absent, the tick labels take `tickDefault` (compact in a narrow
 * frame), while the readout keeps `readoutDefault`, the full precision.
 *
 * @internal
 */
function axisFormatters(
	explicit: ((value: number) => string) | undefined,
	tickDefault: (value: number) => string,
	readoutDefault: (value: number) => string,
): AxisFormatters {
	return { tick: explicit ?? tickDefault, readout: explicit ?? readoutDefault }
}

/**
 * Resolves both value axes from the `axes` config and the frame's tier budget:
 *
 * - Each axis's domain candidates and pins.
 * - Its `format`, winning over the chart's `formatValue`.
 * - Its tick and readout formatters.
 * - Its title.
 *
 * Two formatters per axis, not one. The tick labels take the compact default in
 * a narrow frame (`compact`): locale compact notation to one fraction digit
 * (`48.2K`, `1.3M`), where a full-format label would crowd the plot. The readout always reads full precision, so
 * a gutter stays cheap without coarsening the numbers a reader opens the tooltip
 * for. That readout is the tooltip, the hidden table, and the reference rules.
 * An explicit `format` / `formatValue` overrides both. Titles resolve only
 * when the tier affords them (`axisTitles`), so a narrow frame reserves no title
 * band.
 *
 * @internal
 */
export function resolveValueAxes<T>(
	props: Pick<CartesianChartProps<T>, 'formatValue' | 'reference'>,
	axes: Partial<CartesianAxes>,
	visible: SeriesMeta[],
	stack: StackMode,
	data: T[],
	referenceHidden: ReadonlySet<number>,
	compact: boolean,
	axisTitles: boolean,
	locale: string | undefined,
): ResolvedValueAxes {
	// The tick labels take the compact default in a narrow frame; the readout keeps
	// full precision. An explicit per-axis or chart formatter wins for both. The
	// defaults write numbers in the ambient locale, as the band axis writes dates.
	const readoutDefault = fractionFormat(locale)

	const tickDefault = compact ? compactFormat(locale) : readoutDefault

	const y = axisFormatters(axes.y?.format ?? props.formatValue, tickDefault, readoutDefault)

	const y2 = axisFormatters(axes.y2?.format ?? props.formatValue, tickDefault, readoutDefault)

	const yDomainValues = domainValuesFor({
		axis: 'y',
		visible,
		stack,
		data,
		reference: props.reference,
		referenceHidden,
	})

	const y2DomainValues = domainValuesFor({
		axis: 'y2',
		visible,
		stack,
		data,
		reference: props.reference,
		referenceHidden,
	})

	// The y2 axis exists only while something binds to it — a visible y2-bound
	// series, a y2 reference, or a domain pin — so a single-axis chart never
	// reserves the gutter.
	const hasY2Axis =
		y2DomainValues.length > 0 ||
		visible.some((meta) => meta.axis === 'y2') ||
		axes.y2?.min !== undefined ||
		axes.y2?.max !== undefined

	// The y axis stands down the same way once everything binds y2; with no y2
	// axis it stays on as the default home, so an empty chart still frames its
	// value axis.
	const hasYAxis =
		!hasY2Axis ||
		yDomainValues.length > 0 ||
		visible.some((meta) => meta.axis === 'y') ||
		axes.y?.min !== undefined ||
		axes.y?.max !== undefined

	return {
		value: hasYAxis
			? {
					domainValues: yDomainValues,
					min: axes.y?.min,
					max: axes.y?.max,
					format: y.tick,
					title: axisTitles ? axes.y?.title : undefined,
				}
			: undefined,
		value2: hasY2Axis
			? {
					domainValues: y2DomainValues,
					min: axes.y2?.min,
					max: axes.y2?.max,
					format: y2.tick,
					title: axisTitles ? axes.y2?.title : undefined,
				}
			: undefined,
		bandTitle: axisTitles ? axes.x?.title : undefined,
		formatAxisValue: (value, axis) => (axis === 'y2' ? y2.readout(value) : y.readout(value)),
	}
}

/**
 * The grid positions along the value axis. Each axis contributes its ticks while
 * its `grid` flag holds, so one hairline layer serves both axes. `y` is on by
 * default, and `y2` stands in only when no `y` scale resolves. The tier's
 * grid gate stands the whole layer down at spark, where the value ticks are
 * already gone.
 *
 * @internal
 */
export function gridPositionsOf(
	axes: Partial<CartesianAxes>,
	layout: CartesianLayout,
	grid: boolean,
): number[] {
	if (!grid) return []

	const yGrid = (axes.y?.grid ?? true) && layout.valueScale !== null

	const y2Grid = (axes.y2?.grid ?? layout.valueScale === null) && layout.value2Scale !== null

	// De-duplicated: two independent scales can land ticks on one position —
	// both domains' floors map to the plot edge — and one hairline is enough.
	return [
		...new Set([
			...(yGrid ? layout.valueTicks.map((tick) => tick.at) : []),
			...(y2Grid ? layout.value2Ticks.map((tick) => tick.at) : []),
		]),
	]
}

/**
 * The band-axis divider positions — one per boundary between adjacent rows, none
 * at the ends — when the category axis sets a `separator`. Gated by the same tier
 * grid switch as the value grid, so the dividers stand down together with the
 * rest of the chrome at spark. Empty otherwise.
 *
 * @internal
 */
export function categoryGridPositionsOf(
	axes: Partial<CartesianAxes>,
	layout: CartesianLayout,
	count: number,
	grid: boolean,
): number[] {
	if (!(axes.x?.separator && grid)) return []

	return bandBoundaries(layout.band, count)
}

/**
 * Each reference line's value-axis position, projected through its own axis's
 * scale. It is index-aligned to the prop, so a keyboard stop maps back to the
 * rule {@link ChartReferenceLines} draws for it. A non-finite value, an axis
 * with no resolved scale, or a rule toggled off through its legend chip holds
 * its slot with `null`. It draws no rule, and offers no stop.
 *
 * @internal
 */
export function referencePositionsOf(
	reference: ChartReferenceLine[] | undefined,
	scales: Record<ChartValueAxisId, LinearScale | null>,
	hidden: ReadonlySet<number>,
): (number | null)[] {
	return (reference ?? []).map((line, index) => {
		const scale = scales[line.axis ?? 'y']

		return scale && Number.isFinite(line.value) && !hidden.has(index) ? scale.map(line.value) : null
	})
}
