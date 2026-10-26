'use client'

import { useComposedRefs } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../core'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import type { AccessibleName } from '../../../types'
import { fractionFormat, once, parseNumeric } from '../../../utilities'
import {
	type MapAspectRatio,
	type MapFeature,
	type MapGeography,
	type MapLegendInput,
	MapPlat,
	type MapPlatProps,
	type MapProjection,
} from '../../map'
import { numericRegionData } from '../../map/engine/map-region/data'
import type { ChartContextMenuConfig } from '../engine/chart-context-menu'
import { ChartContextMenu } from '../engine/chart-context-menu'
import { ChartMenuButton } from '../engine/chart-menu-button'
import { READOUT_GAP } from '../engine/chart-series'
import type { ChartItemClick, ChartReadout, DataKey } from '../engine/types'

/**
 * The one series a choropleth shades regions with: the id and value fields to
 * join and color by, plus the data-driven color scale. Mirrors the chart
 * family's `series` shape and AG Charts' map-shape series (`idKey` / `colorKey`
 * / `colorRange` / `colorDomain` / `colorName`).
 */
export type ChoroplethChartSeries<T> = {
	/** The field joining a row to a geography feature id (see {@link regionId}); AG Charts' `idKey`. */
	idKey: DataKey<T>
	/** The numeric field the scale shades by; AG Charts' `colorKey`. */
	colorKey: DataKey<T>
	/**
	 * The color scale as ordered CSS color stops, low → high: the data-driven
	 * range (AG Charts' `colorRange`). The bins sample it; the range legend
	 * paints it as a continuous bar.
	 */
	colorRange: string[]
	/**
	 * Fixed `[min, max]`; derived from the data extent when omitted. AG Charts'
	 * `colorDomain`. It applies to `'linear'` binning. Quantile bins cut the data,
	 * so under `'quantile'` the scale spans the data extent and this is ignored.
	 */
	colorDomain?: [number, number]
	/** The value's display name; the legend caption / table header. AG Charts' `colorName`. */
	colorName?: string
	/**
	 * Bin count for the scale and its legend.
	 * @defaultValue one bin per `colorRange` stop.
	 */
	bins?: number
	/**
	 * How the bins divide the data: `'linear'` (the default) by equal value span,
	 * or `'quantile'` by rank. The quantile cut gives each shade a similar number
	 * of regions. That is the reading for skewed data, where an equal-interval
	 * ramp leaves most regions in the lowest bucket. Pair it with a `bins` count above the ramp's
	 * stop count for a finer gradient.
	 * @defaultValue 'linear'
	 */
	binning?: 'linear' | 'quantile'
}

/**
 * Props for {@link ChoroplethChart}. Requires an accessible name (`aria-label`
 * or `aria-labelledby`): the plot is `role="img"`, so assistive tech needs a
 * name for it. Region values also ship in a visually-hidden table, so the map
 * carries full value parity without the pointer.
 */
export type ChoroplethChartProps<T = never> = AccessibleName & {
	/** The rows to shade regions by. */
	data: T[]
	/**
	 * The one series to shade regions with. A one-element tuple, as pie and donut
	 * take: the map draws one color scale, so a second entry had no reading.
	 * Empty draws the data-less map, every region in the one neutral fill.
	 */
	series: [] | [ChoroplethChartSeries<T>]
	/**
	 * Formats the tooltip value, table cell, legend labels, and the CSV and copy
	 * actions. Absent, the chart family's locale default formats them all.
	 */
	formatValue?: (value: number) => string
	/**
	 * The geometry to draw: a TopoJSON topology or a GeoJSON feature collection.
	 * The package ships no atlas data: pass `us-atlas`, `world-atlas`, or any
	 * equivalent source. `null` or omitted reserves the frame and paints nothing
	 * until the geography arrives.
	 */
	geography?: MapGeography | null
	/** Which topology object to draw; defaults to the topology's first key. */
	geographyObject?: string
	/**
	 * How the globe projects onto the frame. Pass `'albers-usa'` for US state
	 * maps: it places Alaska and Hawaii as insets.
	 * @defaultValue 'mercator'
	 */
	projection?: MapProjection
	/**
	 * A region's identity, matched against each row's `idKey` value.
	 * @defaultValue `String(feature.id ?? feature.properties.name)`
	 */
	regionId?: (feature: MapFeature) => string
	/**
	 * A region's tooltip and table name.
	 * @defaultValue `String(feature.properties.name ?? feature.id)`
	 */
	regionLabel?: (feature: MapFeature) => string
	/**
	 * Frame width in px; omitted, the map measures its container and fills it.
	 * @remarks Without `width`, the frame needs a parent with a definite width,
	 * as {@link MapPlat} says. A `left` or `right` legend goes beside the plot
	 * only at a frame width of 32rem (`@lg`) or more.
	 */
	width?: number
	/** Frame height in px; wins over `aspectRatio` when set. */
	height?: number
	/**
	 * Height as a ratio of the width. Defaults to `'16/9'`, the shared chart-tile
	 * ratio the cartesian and pie charts hold, rather than the map's own `'auto'`
	 * fit. A choropleth therefore lines up with the charts it sits beside in a
	 * dashboard row, instead of running taller and driving the row height. Pass `'auto'` to
	 * take the fitted geography's own projected proportions.
	 * @defaultValue '16/9'
	 */
	aspectRatio?: MapAspectRatio
	/**
	 * Shows the legend. `'range'` swaps the binned switchboard for a continuous
	 * color-scale bar (the heatmap legend) and the object form `{ placement }`
	 * places that bar explicitly. A placement moves the legend above (`'top'`),
	 * below (`'bottom'`), or beside the plot (`'left'` / `'right'`). The range bar
	 * follows its placement's orientation: vertical beside the plot, horizontal
	 * above or below. It also follows the chart's tier. It sheds at the spark
	 * size. In a box too narrow for a side rail it drops to a horizontal row under
	 * the plot. Defaults to the right for the choropleth.
	 * @defaultValue 'right'
	 */
	legend?: MapLegendInput
	/**
	 * Shows the hover tooltip naming the pointed region and its value.
	 * @defaultValue true
	 */
	tooltip?: boolean
	/**
	 * Fires when a click lands on a region, with the region's id and its feature
	 * index. The cross-filter hook the cartesian charts' `onCategoryClick` is,
	 * and the same {@link ChartItemClick} shape. Pair it with `selectedRegion` to
	 * hold a selection. It also points the cursor over the regions, so they read
	 * as clickable. On the keyboard, Enter and Space pick the region under the
	 * arrow cursor. A touch picks with a double tap, because one tap on a map
	 * picks nothing (see {@link MapPlatProps.onRegionClick}).
	 */
	onRegionClick?: ChartItemClick
	/**
	 * The selected region, by the id that `onRegionClick` reports. The region
	 * takes a ring in the selection ink, and the rest of the map keeps its
	 * colors. The chart holds no selection state of its own, so the click, a
	 * control beside the map, or a route parameter can own the value. An id that
	 * names no region draws no ring, and `null` (or no value) selects nothing.
	 * See {@link MapPlatProps.selectedRegion}.
	 */
	selectedRegion?: string | null
	/**
	 * Fires when the legend switches a bin on or off, with the set of legend ids
	 * that it has switched off: the id of each bin, as `binEmphasisId` names it.
	 * Observation only, as the other charts' `onHiddenChange` is: the legend owns
	 * the set. The range legend has no switches and never fires it. See
	 * {@link MapPlatProps.onHiddenChange}.
	 */
	onHiddenChange?: (hidden: ReadonlySet<string>) => void
	/**
	 * Animates the scale in on mount: the neutral geography paints at once, then
	 * the color washes in region by region.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Names the right-click menu's fullscreen dialog and seeds the download
	 * filenames. The choropleth draws no header, so it is not painted on the map.
	 */
	title?: string
	/**
	 * The right-click context menu. By default the choropleth offers Fullscreen, a
	 * live interactive copy in a large dialog. Then it offers View data and Copy
	 * data from the `data`, and last the downloads: PNG and JPG (legend
	 * included), and CSV. View data shows the values in a table in a dialog.
	 * Pass a config to add custom `items`, place them `'before'` or `'after'` the
	 * defaults, or drop them with `defaultItems: false`. Set
	 * `downloadLegend: false` to export the map without its legend. `false`
	 * disables the menu, leaving the browser's
	 * native one.
	 *
	 * A touch screen has no right-click, so there a touch hold on the map opens
	 * the same menu. Set `button: true` to also show a menu button where the
	 * primary pointer is coarse. The choropleth draws no header, so the button
	 * sits in the top end corner of the map. Inside a box that gives a header
	 * row, such as a dashboard tile, it goes to that row.
	 * @see {@link ChartContextMenuConfig}
	 */
	contextMenu?: ChartContextMenuConfig | false
	className?: string
}

/**
 * The context menu's CSV / copy readout: one column of region ids against one
 * column of formatted values, built from the input `data`. It is a faithful
 * export of the rows the caller passed, keyed by the `idKey` they join on. Distinct from
 * the map's own feature-joined table, which names regions from the geography and
 * carries the no-data ones; this mirrors the data instead. `null` with no series
 * or no rows, which drops the data actions from the menu.
 *
 * @internal
 */
function choroplethReadout<T>(
	data: T[] | undefined,
	primary: ChoroplethChartSeries<T> | undefined,
	format: (value: number) => string,
): ChartReadout | null {
	if (!primary || !data || data.length === 0) return null

	const { idKey, colorKey, colorName } = primary

	return {
		categories: data.map((row) => String(row[idKey])),
		rows: [
			{
				label: colorName ?? colorKey,
				swatchClass: '',
				swatch: 'rect',
				values: data.map((row) => {
					const value = parseNumeric(row[colorKey])

					return value === null ? READOUT_GAP : format(value)
				}),
			},
		],
	}
}

/**
 * A choropleth: geographic regions shaded by a numeric value along a
 * data-driven color scale. It re-composes the map module's {@link MapPlat}: the
 * same geography loading, projection, merged legend, pointer tooltip, and
 * visually-hidden data table. It drives the numeric mode from an
 * AG-Charts-aligned `series` (`idKey` / `colorKey` / `colorRange`). Pass
 * `legend="range"` for the continuous heatmap scale bar. Regions with no
 * matching row take the neutral no-data fill.
 *
 * @example
 * ```tsx
 * <ChoroplethChart
 *   aria-label="Population by state"
 *   geography={states}
 *   projection="albers-usa"
 *   data={statePopulation}
 *   series={[{ idKey: 'state', colorKey: 'people', colorRange: blues, colorName: 'Population' }]}
 * />
 * ```
 */
export function ChoroplethChart<T = never>(props: ChoroplethChartProps<T>) {
	// `contextMenu` and `title` are the menu's, not MapPlat's; peel them off the
	// rest that spreads onto the map. `className` is peeled to join the touch
	// classes, then handed to MapPlat below. `data` is peeled
	// because it belongs to the region-data branch below, which decides whether
	// the map carries rows at all: left in the rest it would survive the branch's
	// spread and hand a data-less map its rows back.
	// `legend` comes out with the region-data fields rather than riding `...map`:
	// it is part of the region-data union now, because its range form paints the
	// scale only the numeric branch carries. The constructor below places it on
	// whichever branch the series resolves to.
	const { series, formatValue, contextMenu, title, className, data, legend, ...map } = props

	// The right-clicked region, reported outward by the map (its hover state is provider-isolated, so the
	// menu cannot read it). Set once per right-click (never per hover), so the map's render isolation
	// holds; the wrapping div's capture-phase reset clears it first, so an off-region right-click offers
	// the whole-widget items alone.
	const [menuRegion, setMenuRegion] = useState<number | null>(null)

	const [primary] = series

	// The menu target is the index of the region's row in `data`, so a consumer
	// reads the row out of its own data by index. The map reports the region id
	// and the feature index, and the feature order is not the data order. The
	// map joins a region to the last row with its id, so this does too. A region
	// with no row targets no row.
	const rowIndexById = useMemo(() => {
		const idKey = primary?.idKey

		if (!idKey || !data) return new Map<string, number>()

		return new Map(data.map((row, index) => [String(row[idKey]), index]))
	}, [data, primary?.idKey])

	const onRegionContextMenu = useCallback(
		(id: string) => setMenuRegion(rowIndexById.get(id) ?? null),
		[rowIndexById],
	)

	// The default writes numbers in the ambient locale, as a cartesian chart does.
	const { locale } = useLocale()

	const format = formatValue ?? fractionFormat(locale)

	// Built from the input rows for the menu's CSV / copy actions; with no rows
	// or no series there is nothing to export, so the actions drop. A cached
	// thunk (`ChartReadoutSource`), so only a selected action materializes it.
	const readout = useMemo(
		() =>
			primary && data && data.length > 0
				? once(() => choroplethReadout(data, primary, format))
				: null,
		[data, primary, format],
	)

	// The rasterized root: the map's own frame, so an image export captures the
	// map tightly, with no gutter.
	const rootRef = useRef<HTMLDivElement>(null)

	// The same root, held as state: the corner menu button portals into it, and
	// the map takes no HTML children.
	const [mapRoot, setMapRoot] = useState<HTMLDivElement | null>(null)

	const mapRefs = useComposedRefs(rootRef, setMapRoot)

	// Unwrap the (single) series onto MapPlat's numeric mode. The fields go through
	// `numericRegionData` rather than onto the literal one at a time: `series[0]`
	// is possibly absent, so each field read off it widens by `undefined` and the
	// assembled object matches no branch of the region-data union. The constructor
	// tests the four required fields together and returns a branch, which is what
	// lets these props be checked (`satisfies`) instead of asserted.
	const mapProps = {
		...map,
		// A choropleth is always a chart tile, so default it to the board's shared
		// 16/9 ratio (overridable) to match its neighbors.
		aspectRatio: map.aspectRatio ?? '16/9',
		...numericRegionData<T>({
			legend,
			data,
			regionKey: primary?.idKey,
			valueKey: primary?.colorKey,
			colorRange: primary?.colorRange,
			colorDomain: primary?.colorDomain,
			colorName: primary?.colorName,
			bins: primary?.bins,
			binning: primary?.binning,
			// The chart family's default, not the map's `String`: the tooltip, table,
			// and legend then read the same numbers as the CSV and copy actions.
			formatValue: format,
		}),
	} satisfies MapPlatProps<T>

	return (
		<ChartContextMenu
			contextMenu={contextMenu}
			rootRef={rootRef}
			readout={readout}
			title={title}
			targetIndex={menuRegion}
			fullscreen={<ChoroplethChart {...props} />}
		>
			<div
				data-slot="choropleth"
				// No box of its own: the map frame sizes the chart. The element holds
				// the chart's slot and its right-click capture.
				className="contents"
				// Capture runs before the region layer's bubbled report: an off-region
				// right-click stays null, an on-region one overwrites with its index.
				onContextMenuCapture={() => setMenuRegion(null)}
			>
				<MapPlat<T>
					{...mapProps}
					ref={mapRefs}
					// A long press opens the menu, so the whole chart, legend included,
					// selects no text under a hold, as the chart frame does.
					// The corner menu button anchors to the map root.
					className={cn(k.touch.readout, 'relative', className)}
					onRegionContextMenu={onRegionContextMenu}
				/>

				{/* The touch menu button: in the header row of a box around the map, such
				    as a dashboard tile, else in the corner of the map. */}
				<ChartMenuButton title={title} place="host" />

				{mapRoot && createPortal(<ChartMenuButton title={title} place="corner" />, mapRoot)}
			</div>
		</ChartContextMenu>
	)
}
