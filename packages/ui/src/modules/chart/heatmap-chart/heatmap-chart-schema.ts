/**
 * The {@link HeatmapChart}'s schema: the one series it reads (two categorical
 * keys and a value key with a data-driven colour scale) and the pure pivot from
 * flat rows to the row-major matrix the geometry projects. The series mirrors
 * {@link ChoroplethChartSeries} — the module's other sequential-colour chart —
 * and AG Charts' heatmap series (`xKey` / `yKey` / `colorKey` / `colorRange` /
 * `colorDomain` / `colorName`), so the two colour-scaled charts read the same.
 *
 * The frame props reuse {@link ChartBaseProps} unchanged; a heatmap adds no
 * value axis (both axes are categorical), so it takes none of the cartesian
 * value-domain or crosshair switches.
 */

import type { ChartBaseProps, DataKey } from '../chart-schema'

/**
 * The one series a heatmap shades cells with: the two fields that place a cell
 * on the grid and the numeric field the sequential scale colours it by.
 *
 * @remarks `colorKey` is read as `Number(datum[colorKey])`; a non-finite result
 * draws the cell in the neutral no-data fill and an em-dash table row, without
 * pulling on the colour domain.
 */
export type HeatmapChartSeries<T> = {
	/** The field holding each row's column category — the x (band) axis. AG Charts' `xKey`. */
	xKey: DataKey<T>
	/** The field holding each row's row category — the y (band) axis. AG Charts' `yKey`. */
	yKey: DataKey<T>
	/** The numeric field the scale shades by. AG Charts' `colorKey`. */
	colorKey: DataKey<T>
	/**
	 * The colour scale as ordered CSS colour stops, low → high — the data-driven
	 * range (AG Charts' `colorRange`). The bins sample it; the `'range'` legend
	 * paints it as a continuous bar, matching the choropleth.
	 */
	colorRange: string[]
	/** Fixed `[min, max]`; derived from the data extent when omitted. AG Charts' `colorDomain`. */
	colorDomain?: [number, number]
	/** The value's display name; the legend caption and table header. AG Charts' `colorName`. */
	colorName?: string
	/**
	 * Equal-interval bin count for the scale and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
}

/**
 * Props for {@link HeatmapChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`. Cell values also ship in the
 * visually-hidden data table (categories × rows), so the grid carries full
 * value parity without the pointer, the way every chart in the module does.
 *
 * @remarks The grid wires neither `animate` nor `texture` from the base props;
 * the component destructures them off so they never reach the plot element,
 * pending a grid that honours them.
 */
export type HeatmapChartProps<T = never> = ChartBaseProps<T> & {
	/** The single series to shade cells with; extra entries are ignored. */
	series: HeatmapChartSeries<T>[]
}

/**
 * The pivot from flat rows to the geometry's row-major matrix: the distinct
 * `yKey` values become rows (first-seen order), the distinct `xKey` values
 * columns, and each `[row][col]` holds the matching row's `colorKey` value —
 * `null` where a pair has no row or a non-finite value. Preserving first-seen
 * order keeps the axes stable across data updates rather than resorting.
 *
 * @internal
 */
export type HeatmapMatrix = {
	/** Distinct column categories, in first-seen order — the x-axis band labels. */
	columns: string[]
	/** Distinct row categories, in first-seen order — the y-axis band labels. */
	rows: string[]
	/** Row-major values: `values[row][col]`, `null` for an absent or non-finite cell. */
	values: (number | null)[][]
}

/**
 * Builds the {@link HeatmapMatrix} from the rows. Last write wins on a repeated
 * `(xKey, yKey)` pair, matching the readout the hidden table renders from the
 * same source.
 *
 * @internal
 */
export function resolveHeatmapMatrix<T>(
	data: T[],
	{ xKey, yKey, colorKey }: HeatmapChartSeries<T>,
): HeatmapMatrix {
	const columns: string[] = []
	const rows: string[] = []

	const colIndex = new Map<string, number>()
	const rowIndex = new Map<string, number>()

	const index = (label: string, order: string[], seen: Map<string, number>): number => {
		const at = seen.get(label)

		if (at !== undefined) return at

		const next = order.length

		order.push(label)
		seen.set(label, next)

		return next
	}

	// First pass fixes the axes so the matrix is rectangular before filling.
	for (const datum of data) {
		index(String(datum[xKey]), columns, colIndex)
		index(String(datum[yKey]), rows, rowIndex)
	}

	const values: (number | null)[][] = rows.map(() => columns.map(() => null))

	for (const datum of data) {
		const col = colIndex.get(String(datum[xKey]))
		const row = rowIndex.get(String(datum[yKey]))

		if (col === undefined || row === undefined) continue

		const value = Number(datum[colorKey])

		const cells = values[row]

		if (cells) cells[col] = Number.isFinite(value) ? value : null
	}

	return { columns, rows, values }
}
