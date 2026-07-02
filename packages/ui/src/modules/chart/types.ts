import type { Step } from '../../recipes'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import type { AccessibleName } from '../../types'

/** A key of `T` naming the field a chart reads from each datum. */
export type DataKey<T> = keyof T & string

/**
 * One plotted series: which field it reads and how the legend and tooltip
 * name it.
 *
 * @remarks Values are read as `Number(datum[key])`; a non-finite result draws
 * as a gap (line) or an omitted mark (bar) and an em-dash tooltip row, without
 * collapsing the scale.
 */
export type ChartSeries<T> = {
	/** The field holding this series' numeric value. */
	key: DataKey<T>
	/** Legend and tooltip name. */
	label: string
	/**
	 * Named mark colour override. Defaults to the categorical slot palette in
	 * fixed order, so a series keeps its colour when siblings toggle.
	 */
	color?: ChartSeriesColor
}

/**
 * A combo-chart series also names the mark it draws with; bars render behind
 * lines on the one shared value axis.
 */
export type ComboChartSeries<T> = ChartSeries<T> & {
	/** Draw this series as bars or as a line. */
	type: 'bar' | 'line'
}

/**
 * One readout row: a series with its swatch and the pre-formatted value per
 * category (an em-dash where the datum is non-finite).
 *
 * @internal
 */
export type ChartReadoutRow = {
	label: string
	/** Background class carrying the series colour. */
	swatchClass: string
	/** Per-category swatch overrides — pie slices, where the colour follows the category. */
	swatchClasses?: string[]
	/** Swatch shape, mirroring the mark. */
	swatch: 'rect' | 'line'
	/** Formatted value per category index. */
	values: string[]
}

/**
 * The values a chart exposes off the marks: category labels crossed with one
 * row per series. The tooltip reads one column on hover; the visually-hidden
 * table renders all of it for assistive tech, so no value is gated behind a
 * pointer.
 *
 * @internal
 */
export type ChartReadout = {
	categories: string[]
	rows: ChartReadoutRow[]
}

/**
 * Props shared by the cartesian charts (Bar / Line / Combo): the data plus
 * the frame's axes, legend, tooltip, sizing, and animation switches.
 *
 * @internal
 */
export type CartesianChartProps<T> = AccessibleName & {
	/** The rows to plot, in x order. An empty array renders an empty frame. */
	data: T[]
	/** The field holding each row's category label. */
	x: DataKey<T>
	/** The series to plot, one mark set each; slot colours follow this order. */
	series: ChartSeries<T>[]
	/** Resolves against enclosing Density; sets the default frame height and tick count. */
	size?: Step
	/**
	 * Frame width in px. Omitted, the chart measures its container and fills
	 * it; pass a width for a fixed frame (and for deterministic SSR output).
	 */
	width?: number
	/** Frame height in px; overrides the density default. */
	height?: number
	/**
	 * Draw the x and y axes.
	 * @defaultValue true
	 */
	axes?: boolean
	/**
	 * Draw horizontal hairline gridlines at the y ticks.
	 * @defaultValue true
	 */
	gridLines?: boolean
	/**
	 * Show the legend. Defaults to on for two or more series and off for one —
	 * a single series is already named by the chart's accessible name.
	 */
	legend?: boolean
	/**
	 * Show the hover tooltip listing every series at the pointed category.
	 * @defaultValue true
	 */
	tooltip?: boolean
	/**
	 * Animate the marks in on mount with Framer Motion, honouring
	 * `prefers-reduced-motion` through the `ReducedMotion` primitive. Off by
	 * default — a static dashboard of charts stays a plain-SVG tree with no
	 * motion runtime work.
	 * @defaultValue false
	 */
	animate?: boolean
	/** Value-domain floor; defaults to the data (and zero for bars). Pin it to compare charts on one scale. */
	min?: number
	/** Value-domain ceiling; defaults to the data maximum. */
	max?: number
	/** Formats tick and tooltip values; defaults to locale integer/fraction formatting. */
	formatValue?: (value: number) => string
	className?: string
}
