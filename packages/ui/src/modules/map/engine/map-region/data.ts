/**
 * The region-data shape {@link MapPlat} takes: a categorical field, a numeric
 * field (a choropleth), or nothing. Held apart from both readers because two
 * reach it: the plat's own props declare it, and `use-map-region-readout`
 * joins rows on it. A union whose branches must stay mutually exclusive has to
 * have one definition.
 */

import { isRangeLegend, type MapLegendInput, type MapRangeLegendInput } from '../map-legend/plan'
import type { DataKey, MapCategory } from '../types'

/**
 * Show the legend. Defaults to on when there are two or more categories or any
 * registered overlay — the identity channel color alone must never carry. A
 * placement moves the centered row under the plot (`'bottom'`) or above it
 * (`'top'`). It can also move it to a column panel beside the plot (`'left'` /
 * `'right'`), side by side from `lg` and under the map below that. The default
 * placement is `'bottom'` for categorical maps and `'right'` for the numeric
 * choropleth.
 *
 * Overlay entries register from the client, so they join the legend after
 * hydration. The legend's box mounts ahead of them, so late-landing buttons
 * never resize the map or shift the frame.
 *
 * The continuous range bar is the numeric branch's own form and is absent here.
 * A scale bar with no scale behind it has nothing to paint. The resolver drops
 * the request and draws the binned switchboard instead. It is stated in
 * the type so the request cannot be made rather than quietly ignored.
 *
 * Subtracted from {@link MapLegendInput} by the very type {@link isRangeLegend}
 * narrows to. A form added to the prop later therefore reaches all three
 * branches, or is refused here, without either side being re-listed by hand.
 *
 * @internal
 */
type MapSwitchboardLegend = {
	legend?: Exclude<MapLegendInput, MapRangeLegendInput>
}

/** The rows and the field that matches each to a region; shared by both color modes. @internal */
type MapRegionRows<T> = {
	/** The rows to color regions by. */
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
	colorDomain?: undefined
	formatValue?: undefined
	colorName?: undefined
}

/** Regions colored by a categorical field, its slot colors resolved in a fixed order. @internal */
type MapCategoricalData<T> = MapRegionRows<T> &
	MapNumericAbsent &
	MapSwitchboardLegend & {
		/** The field holding the row's category value. */
		categoryKey: DataKey<T>
		/**
		 * Explicit category order, labels, and colors; derived from the data in
		 * first-appearance order when omitted.
		 */
		categories?: MapCategory[]
	}

/** Regions shaded along a sequential ramp by a numeric field — a choropleth. @internal */
type MapNumericData<T> = MapRegionRows<T> & {
	/** The field holding the row's numeric value; shades regions along the color range. */
	valueKey: DataKey<T>
	/** Ordered CSS color stops the bins sample, low → high — the data-driven scale. */
	colorRange: string[]
	/**
	 * Bin count for the ramp and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
	/**
	 * How the bins divide the data. `'linear'` (the default) divides by equal
	 * value span. `'quantile'` divides by rank, so each shade covers a similar
	 * number of regions. Quantile is the reading for skewed data, where an
	 * equal-interval ramp leaves most regions in the lowest bucket. The range legend shows the
	 * ramp and the data extent either way. Under `'quantile'` the color-to-value
	 * mapping is non-linear, so the bar reads as an approximation of where the
	 * breaks fall.
	 * @defaultValue 'linear'
	 */
	binning?: 'linear' | 'quantile'
	/**
	 * Fixed `[min, max]` for the ramp; derived from the data extent when omitted.
	 * It applies to `'linear'` binning. Under `'quantile'` the scale spans the
	 * data extent and this is ignored. `ChoroplethChartSeries` spells it the same.
	 */
	colorDomain?: [number, number]
	/** Formats the bin-range labels, the tooltip value, and the table cell. `ChoroplethChart` spells it the same. */
	formatValue?: (value: number) => string
	/** The value's display name; the table's value-column header. `ChoroplethChartSeries` spells it the same. */
	colorName?: string
	/**
	 * Show the legend, in any form. This is the branch that carries a scale, so it
	 * is the branch that can paint one. Beyond the switchboard's boolean and
	 * placement, `'range'` swaps the binned switchboard for a continuous
	 * color-scale bar, the heatmap legend. The object form `{ placement }` places
	 * that bar explicitly. The bar follows its placement's orientation (vertical
	 * beside the plot, horizontal above or below) and the chart's tier. It sheds
	 * at the spark size and, in a box too narrow for a side rail, drops to a
	 * horizontal row under the plot.
	 *
	 * @see the switchboard forms on the other two branches for what a legend
	 * shows by default and when it shows at all.
	 */
	legend?: MapLegendInput
	categoryKey?: undefined
	categories?: undefined
}

/** A data-less map: it draws its geography in the neutral fill as a backdrop for overlays. @internal */
type MapNoData = MapNumericAbsent &
	MapSwitchboardLegend & {
		data?: undefined
		regionKey?: undefined
		categoryKey?: undefined
		categories?: undefined
	}

/**
 * The region-data the map colors by: a categorical field, a numeric field (a
 * choropleth), or nothing. The category and value keys are mutually exclusive;
 * each mode's fields travel together or not at all.
 *
 * `legend` rides the union rather than the props around it because one of its
 * forms is a mode. The continuous range bar paints a scale, and only the
 * numeric branch has one.
 *
 * @internal
 */
export type MapRegionData<T> = MapCategoricalData<T> | MapNumericData<T> | MapNoData

/**
 * The numeric branch's own shape with every field optional. They are the
 * choropleth fields as a caller holds them before it knows it has a scale to
 * shade by.
 *
 * @internal
 */
type MapNumericInput<T> = Partial<MapNumericData<T>>

/**
 * Narrows loose choropleth fields onto one branch of {@link MapRegionData}. It
 * is the numeric branch when the rows, the join key, the value key, and the
 * ramp are all present. It is the data-less map when any one is missing.
 *
 * @remarks A caller that reads its scale out of an optional series holds no
 * whole branch to hand on. `ChoroplethChart` takes `series[0]`, which
 * `noUncheckedIndexedAccess` types as possibly absent. Each field it reads
 * therefore widens by `undefined`, and the object it assembles matches no
 * branch. That is the reason that call site asserted its props rather than
 * checking them. The four fields the branch requires are tested together here,
 * once. The object therefore comes out of the test as a branch the union
 * already accepts.
 * @internal
 */
export function numericRegionData<T>(fields: MapNumericInput<T>): MapRegionData<T> {
	const { data, regionKey, valueKey, colorRange } = fields

	// Any one of the four missing and there is no scale, so the map draws its
	// geography in the neutral fill. The empty branch goes back rather than the
	// fields that came in, because a partial numeric object is exactly what the
	// union exists to refuse; nothing reads differently for it, since rows with
	// no `regionKey` to join on already resolve neutral (`useMapRegionReadout`).
	//
	// The legend crosses, because a placement is a layout the caller asked for
	// and holds whether a scale landed or not. Only its range form is dropped:
	// that form paints the scale this branch does not have, and the resolver was
	// already dropping it — this is the same silence, one layer earlier, where it
	// keeps the returned object inside a branch of the union.
	if (
		data === undefined ||
		regionKey === undefined ||
		valueKey === undefined ||
		colorRange === undefined
	) {
		return { legend: isRangeLegend(fields.legend) ? undefined : fields.legend }
	}

	return { ...fields, data, regionKey, valueKey, colorRange }
}
