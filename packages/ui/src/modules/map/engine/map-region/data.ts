/**
 * The region-data shape {@link MapPlat} takes: a categorical field, a numeric
 * field (a choropleth), or nothing. Held apart from both readers because two
 * reach it — the plat's own props declare it, and `use-map-region-readout`
 * joins rows on it — and a union whose branches must stay mutually exclusive
 * has to have one definition.
 */

import type { DataKey, MapCategory } from '../types'

/** The rows and the field that matches each to a region; shared by both colour modes. @internal */
type MapRegionRows<T> = {
	/** The rows to colour regions by. */
	data: T[]
	/** The field matching a row to a region's id (see `regionId`). */
	regionKey: DataKey<T>
}

/** The numeric-mode fields, absent (as `undefined`) on the categorical and empty branches. @internal */
type MapNumericAbsent = {
	valueKey?: undefined
	colorRange?: undefined
	bins?: undefined
	binning?: undefined
	domain?: undefined
	valueFormat?: undefined
	valueName?: undefined
}

/** Regions coloured by a categorical field, its slot colours resolved in a fixed order. @internal */
type MapCategoricalData<T> = MapRegionRows<T> &
	MapNumericAbsent & {
		/** The field holding the row's category value. */
		categoryKey: DataKey<T>
		/**
		 * Explicit category order, labels, and colours; derived from the data in
		 * first-appearance order when omitted.
		 */
		categories?: MapCategory[]
	}

/** Regions shaded along a sequential ramp by a numeric field — a choropleth. @internal */
type MapNumericData<T> = MapRegionRows<T> & {
	/** The field holding the row's numeric value; shades regions along the colour range. */
	valueKey: DataKey<T>
	/** Ordered CSS colour stops the bins sample, low → high — the data-driven scale. */
	colorRange: string[]
	/**
	 * Bin count for the ramp and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
	/**
	 * How the bins divide the data: `'linear'` (the default) by equal value
	 * span, or `'quantile'` by rank so each shade covers a similar number of
	 * regions — the reading for skewed data, where an equal-interval ramp leaves
	 * most regions in the lowest bucket. The range legend shows the ramp and the
	 * data extent either way; under `'quantile'` the colour-to-value mapping is
	 * non-linear, so the bar reads as an approximation of where the breaks fall.
	 * @defaultValue 'linear'
	 */
	binning?: 'linear' | 'quantile'
	/** Fixed `[min, max]` for the ramp; derived from the data extent when omitted. */
	domain?: [number, number]
	/** Formats the bin-range labels, the tooltip value, and the table cell. */
	valueFormat?: (value: number) => string
	/** The value's display name; the table's value-column header. */
	valueName?: string
	categoryKey?: undefined
	categories?: undefined
}

/** A data-less map: it draws its geography in the neutral fill as a backdrop for overlays. @internal */
type MapNoData = MapNumericAbsent & {
	data?: undefined
	regionKey?: undefined
	categoryKey?: undefined
	categories?: undefined
}

/**
 * The region-data the map colours by: a categorical field, a numeric field (a
 * choropleth), or nothing. The category and value keys are mutually exclusive;
 * each mode's fields travel together or not at all.
 *
 * @internal
 */
export type MapRegionData<T> = MapCategoricalData<T> | MapNumericData<T> | MapNoData
