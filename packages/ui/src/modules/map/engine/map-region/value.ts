/**
 * Map-shaped adapters over the shared sequential color scale
 * ({@link ../../../../utilities/color-scale}). They quantize a `valueKey` into
 * equal-interval or equal-count (quantile) bins. They emit the bins as the map's
 * {@link MapCategoryMeta} shape, a `value`-kind paint. The region fills, legend,
 * tooltip, and table then read them the way they read categorical slots. The
 * numeric analogue of `category.ts`. The color maths itself — sampling the
 * ramp, binning the domain — lives in the shared utility, so the choropleth and
 * the heatmap share one scale.
 */

import { fractionFormat, parseNumeric, resolveBinScale, valueExtent } from '../../../../utilities'
import type { DataKey } from '../types'
import type { MapCategoryMeta } from './category'

/**
 * A map's `formatValue`, or {@link fractionFormat} where it has none: digits in
 * the `<LocaleProvider>` locale with up to two fraction places, as a chart formats
 * the same data. The
 * readout and the range legend resolve it through here, rather than each
 * defaulting for itself. A map without the prop would otherwise format its
 * tooltip and table by one rule, and its bar's endpoints by another. Nothing
 * would catch the drift.
 *
 * @internal
 */
export function resolveValueFormat(
	formatValue: ((value: number) => string) | undefined,
	locale: string | undefined,
): (value: number) => string {
	return formatValue ?? fractionFormat(locale)
}

/** Options a choropleth resolves its bins with. @internal */
export type ValueScaleOptions = {
	/** The ordered CSS color stops the bins sample, low → high. */
	colorRange: string[]
	/** Bin count; defaults to one bin per color stop. */
	bins?: number
	/** Fixed `[min, max]`; derived from the data extent when omitted. */
	domain?: [number, number]
	/** Formats the bin-range endpoints for the legend and table labels. */
	format: (value: number) => string
	/**
	 * How the bins divide the data. The `'linear'` default cuts the value span into
	 * equal-interval buckets. The `'quantile'` mode cuts by rank into equal-count
	 * buckets, so each shade carries a similar number of rows. That is the reading
	 * for skewed data, where equal-interval would pile most rows into the lowest
	 * bucket.
	 */
	binning?: 'linear' | 'quantile'
}

/**
 * Resolves the choropleth bins: one {@link MapCategoryMeta} per bucket, labeled
 * by its value range and painted a color sampled from `colorRange`. Returns the
 * resolved domain (for the range legend's extent), plus an `assign` that maps a
 * raw value to its bin. The `assign` is equal-interval or quantile per
 * `binning`. {@link regionValueJoin} therefore colors regions through the same
 * scale the legend describes. Empty (with a `null` domain and a no-op `assign`) when no row
 * carries a finite value.
 *
 * @internal
 */
export function resolveValueBins<T>(
	data: T[],
	valueKey: DataKey<T>,
	{ colorRange, bins, domain, format, binning = 'linear' }: ValueScaleOptions,
): {
	metas: MapCategoryMeta[]
	domain: [number, number] | null
	/** Maps a raw value to its bin index; `null` is the no-data fill. */
	assign: (value: number) => number | null
	/** The class edges `assign` reads under `'quantile'` binning; absent under `'linear'`. */
	thresholds?: number[]
} {
	const values = data.map((datum) => parseNumeric(datum[valueKey]) ?? Number.NaN)

	// `domain` applies to linear binning. Quantile bins cut the data, so the
	// scale spans the data extent, where the bins sit.
	const resolved = valueExtent(values, binning === 'quantile' ? undefined : domain)

	if (resolved === null) return { metas: [], domain: null, assign: () => null }

	// One resolution yields both the painted bins and the assignment the regions
	// read, so the fills and the legend can't disagree on where the buckets fall.
	const {
		bins: colorBins,
		assign,
		thresholds,
	} = resolveBinScale(values, resolved, colorRange, bins, binning)

	const metas = colorBins.map((bin, index): MapCategoryMeta => {
		const label = bin.hi > bin.lo ? `${format(bin.lo)}–${format(bin.hi)}` : format(bin.lo)

		return { value: String(index), label, paint: { kind: 'value', color: bin.color } }
	})

	return { metas, domain: resolved, assign, thresholds }
}

/** The per-region readout {@link regionValueJoin} resolves, index-aligned with the region ids. @internal */
export type RegionValueJoin = {
	/** Each region's bin index — its color — or `null` off data. */
	regionCategory: (number | null)[]
	/** Each region's own formatted value — the tooltip and table readout, not the bin's range label. */
	regionValues: (string | null)[]
	/** Each region's raw number — the range legend's arrow marks it on the continuous bar. */
	regionNumbers: (number | null)[]
}

/**
 * Matches each region to its row in one pass. The row whose `regionKey` equals
 * the region's id yields:
 *
 * - the bin its color reads from, through `assign` (the
 *   {@link resolveValueBins} scale, equal-interval or quantile alike);
 * - its own formatted value: the tooltip and table show "2,088", not the bin's
 *   "1–135";
 * - its raw number.
 *
 * `null` throughout where no row matches or the value is non-finite — the region
 * draws in the neutral no-data fill and reads silent.
 *
 * @internal
 */
export function regionValueJoin<T>(
	regionIds: string[],
	data: T[],
	regionKey: DataKey<T>,
	valueKey: DataKey<T>,
	assign: (value: number) => number | null,
	format: (value: number) => string,
): RegionValueJoin {
	const byRegion = new Map(data.map((datum) => [String(datum[regionKey]), datum]))

	const regionCategory: (number | null)[] = []

	const regionValues: (string | null)[] = []

	const regionNumbers: (number | null)[] = []

	for (const id of regionIds) {
		const datum = byRegion.get(id)

		const value = datum == null ? null : parseNumeric(datum[valueKey])

		regionCategory.push(value === null ? null : assign(value))

		regionValues.push(value === null ? null : format(value))

		regionNumbers.push(value)
	}

	return { regionCategory, regionValues, regionNumbers }
}
