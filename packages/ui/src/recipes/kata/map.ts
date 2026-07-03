/**
 * Map kata: object-literal surface for the geography map module. The series
 * palette, legend chrome, and readout inks come straight from `kata/chart` —
 * the two data-viz modules read as one colour system, and the CVD-validated
 * slot order must never fork — with the map's own region tokens beside them:
 * the no-data fill, the surface-colour boundary seam, and the hover and
 * de-emphasis treatments.
 */
import { mode } from '../../core/recipe'
import { kokkaku } from '../kiso'
import { type ChartSeriesColor, k as chart } from './chart'

/** A named map mark colour: the chart module's eight categorical slots plus `zinc`. */
export type MapSeriesColor = ChartSeriesColor

/** A slot's mark classes — `stroke`, `fill`, `bg`, `onFill` — shared with the charts. */
export type MapSeriesPaint = (typeof chart.series)[MapSeriesColor]

export const k = {
	/** Shared data-viz palette: same slots, same order, same validation as `kata/chart`. */
	series: chart.series,
	order: chart.order,
	/** An interactive legend entry, identical to the chart legend's. */
	legendItem: chart.legendItem,
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: chart.label,
	/** Tooltip value ink: the strong element, values lead. */
	value: chart.value,
	/** A region with no matching datum — and a toggled-off category's fallback. */
	regionEmpty: mode('fill-zinc-200', 'dark:fill-zinc-800'),
	/** Region boundary seam: the surface colour, so shared borders read as gaps. */
	regionBorder: mode('stroke-white', 'dark:stroke-zinc-900'),
	/** Pointer emphasis on the hovered region. */
	regionHover: 'hover:brightness-110',
	/**
	 * A mark group's response to legend emphasis: marks outside the focused
	 * group dim, the focused group holds. On the wrapper, so motion's inline
	 * opacity composes.
	 */
	group: (dimmed: boolean) => ['transition-opacity', dimmed ? 'opacity-25' : ''],
	/**
	 * The legend's reserved box, mounted before any button registers so the
	 * frame never shifts as entries land: the `row` placements (top / bottom,
	 * and every placement stacked below `lg`) hold one item-row of height,
	 * and the side `panel` holds a fixed column width from `lg` — labels wrap
	 * inside it — so the plot's width never depends on what has registered.
	 */
	legendBox: {
		row: 'min-h-4',
		panel: ['min-h-4', 'shrink-0', 'lg:w-48'],
	},
	skeleton: kokkaku.map,
} as const
