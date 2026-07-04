'use client'

import type { AccessibleName } from '../../../types'
import {
	type MapAspectRatio,
	type MapFeature,
	type MapGeography,
	type MapLegendPlacement,
	MapPlat,
	type MapProjection,
} from '../../map'
import type { DataKey } from '../chart-schema'

/**
 * The one series a choropleth shades regions with: the id and value fields to
 * join and colour by, plus the data-driven colour scale. Mirrors the chart
 * family's `series` shape and AG Charts' map-shape series (`idKey` / `colorKey`
 * / `colorRange` / `colorDomain` / `colorName`).
 */
export type ChoroplethChartSeries<T> = {
	/** The field joining a row to a geography feature id (see {@link regionId}); AG Charts' `idKey`. */
	idKey: DataKey<T>
	/** The numeric field the scale shades by; AG Charts' `colorKey`. */
	colorKey: DataKey<T>
	/**
	 * The colour scale as ordered CSS colour stops, low → high — the data-driven
	 * range (AG Charts' `colorRange`). The bins sample it; the range legend
	 * paints it as a continuous bar.
	 */
	colorRange: string[]
	/** Fixed `[min, max]`; derived from the data extent when omitted. AG Charts' `colorDomain`. */
	colorDomain?: [number, number]
	/** The value's display name; the legend caption / table header. AG Charts' `colorName`. */
	colorName?: string
	/**
	 * Equal-interval bin count for the scale and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
}

/**
 * Props for {@link ChoroplethChart}. Requires an accessible name (`aria-label`
 * or `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it. Region values also ship in a visually-hidden table, so the map
 * carries full value parity without the pointer.
 */
export type ChoroplethChartProps<T = never> = AccessibleName & {
	/** The rows to shade regions by. */
	data: T[]
	/** The series to shade with; the first shades the regions. */
	series: ChoroplethChartSeries<T>[]
	/** Formats the tooltip value, table cell, and legend labels. */
	formatValue?: (value: number) => string
	/**
	 * The geometry to draw: a TopoJSON topology or a GeoJSON feature collection.
	 * The package ships no atlas data — pass `us-atlas`, `world-atlas`, or any
	 * equivalent source. `null` or omitted reserves the frame and paints nothing
	 * until the geography arrives.
	 */
	geography?: MapGeography | null
	/** Which topology object to draw; defaults to the topology's first key. */
	geographyObject?: string
	/**
	 * How the globe projects onto the frame. Pass `'albers-usa'` for US state
	 * maps — it places Alaska and Hawaii as insets.
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
	/** Frame width in px; omitted, the map measures its container and fills it. */
	width?: number
	/** Frame height in px; wins over `aspectRatio` when set. */
	height?: number
	/**
	 * Height as a ratio of the width: `'auto'` takes the fitted geography's own
	 * proportions.
	 * @defaultValue 'auto'
	 */
	aspectRatio?: MapAspectRatio
	/**
	 * Show the legend. `'range'` swaps the binned switchboard for a continuous
	 * colour-scale bar — the heatmap legend. A placement moves it above
	 * (`'top'`), below (`'bottom'`), or beside the plot (`'left'` / `'right'`).
	 * Defaults to the right for the choropleth.
	 * @defaultValue 'right'
	 */
	legend?: boolean | MapLegendPlacement | 'range'
	/**
	 * Show the hover tooltip naming the pointed region and its value.
	 * @defaultValue true
	 */
	tooltip?: boolean
	/**
	 * Animate the scale in on mount: the neutral geography paints at once, then
	 * the colour washes in region by region.
	 * @defaultValue false
	 */
	animate?: boolean
	className?: string
}

/**
 * A choropleth: geographic regions shaded by a numeric value along a
 * data-driven colour scale. It re-composes the map module's {@link MapPlat} —
 * the same geography loading, projection, merged legend, pointer tooltip, and
 * visually-hidden data table — driving its numeric mode from an
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
export function ChoroplethChart<T = never>({
	series,
	formatValue,
	...map
}: ChoroplethChartProps<T>) {
	const [primary] = series

	// Unwrap the (single) series onto MapPlat's numeric mode. The `AccessibleName`
	// union makes a raw spread ambiguous, so assemble the props and assert.
	const props = {
		...map,
		regionKey: primary?.idKey,
		valueKey: primary?.colorKey,
		colorRange: primary?.colorRange,
		domain: primary?.colorDomain,
		valueName: primary?.colorName,
		bins: primary?.bins,
		valueFormat: formatValue,
	} as Parameters<typeof MapPlat<T>>[0]

	return <MapPlat<T> {...props} />
}
