/**
 * Map-shaped adapters over the shared sequential colour scale
 * ({@link ../../utilities/color-scale}): quantise a `valueKey` into
 * equal-interval or equal-count (quantile) bins and emit them as the map's
 * {@link MapCategoryMeta} shape (a `value`-kind paint) so the region fills,
 * legend, tooltip, and table read them the way they read categorical slots. The
 * numeric analogue of `map-categories`. The colour maths itself — sampling the
 * ramp, binning the domain — lives in the shared utility, so the choropleth and
 * the heatmap share one scale.
 */

import {
	binIndex,
	quantileBinIndex,
	resolveColorBins,
	resolveQuantileBins,
	valueExtent,
} from '../../utilities'
import type { MapCategoryMeta } from './map-categories'
import type { DataKey } from './types'

export { sampleRange } from '../../utilities'

/**
 * Coerces a row's raw value to a number for binning, mapping the blanks a data
 * source uses for "no value" — `null`, `undefined`, and empty or whitespace-only
 * strings — to `NaN` rather than the `0` a bare {@link Number} yields for them. A
 * `0` would survive the finite filters as a real value: it drags the derived
 * domain's floor down and paints the row in the lowest bin, when the contract is
 * the neutral no-data fill. A finite number passes through; a numeric string
 * parses; anything else is non-finite and reads as no-data.
 *
 * @internal
 */
function toBinnableNumber(value: unknown): number {
	if (typeof value === 'number') return value

	if (typeof value === 'string' && value.trim() !== '') return Number(value)

	return Number.NaN
}

/** Options a choropleth resolves its bins with. @internal */
export type ValueScaleOptions = {
	/** The ordered CSS colour stops the bins sample, low → high. */
	colorRange: string[]
	/** Bin count; defaults to one bin per colour stop. */
	bins?: number
	/** Fixed `[min, max]`; derived from the data extent when omitted. */
	domain?: [number, number]
	/** Formats the bin-range endpoints for the legend and table labels. */
	format: (value: number) => string
	/**
	 * How the bins divide the data: `'linear'` (the default) cuts the value span
	 * into equal-interval buckets; `'quantile'` cuts by rank into equal-count
	 * buckets, so each shade carries a similar number of rows — the reading for
	 * skewed data, where equal-interval would pile most rows into the lowest bucket.
	 */
	binning?: 'linear' | 'quantile'
}

/**
 * Resolves the choropleth bins: one {@link MapCategoryMeta} per bucket, labelled
 * by its value range and painted a colour sampled from `colorRange`. Returns the
 * resolved domain (for the range legend's extent) and an `assign` that maps a
 * raw value to its bin — equal-interval or quantile per `binning` — so
 * {@link regionValueIndexes} colours regions through the same scale the legend
 * describes. Empty (with a `null` domain and a no-op `assign`) when no row
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
} {
	const values = data.map((datum) => toBinnableNumber(datum[valueKey]))

	const resolved = valueExtent(values, domain)

	if (resolved === null) return { metas: [], domain: null, assign: () => null }

	// One resolution per mode, each yielding both the painted bins and the
	// assignment the regions read — so the fills and the legend can't disagree on
	// where the buckets fall.
	const { colorBins, assign } =
		binning === 'quantile'
			? (() => {
					const { bins: quantileBins, thresholds } = resolveQuantileBins(values, colorRange, bins)

					return {
						colorBins: quantileBins,
						assign: (value: number) => quantileBinIndex(value, thresholds),
					}
				})()
			: (() => {
					const linearBins = resolveColorBins(resolved, colorRange, bins)

					return {
						colorBins: linearBins,
						assign: (value: number) => binIndex(value, resolved, linearBins.length),
					}
				})()

	const metas = colorBins.map((bin, index): MapCategoryMeta => {
		const label = bin.hi > bin.lo ? `${format(bin.lo)}–${format(bin.hi)}` : format(bin.lo)

		return { value: String(index), label, paint: { kind: 'value', color: bin.color } }
	})

	return { metas, domain: resolved, assign }
}

/**
 * Matches each region to its bin: the row whose `regionKey` equals the region's
 * id is placed by its `valueKey` through `assign` (from {@link resolveValueBins}
 * — equal-interval or quantile alike). `null` where no row matches or the value
 * is non-finite — the region draws in the neutral no-data fill.
 *
 * @internal
 */
export function regionValueIndexes<T>(
	regionIds: string[],
	data: T[],
	regionKey: DataKey<T>,
	valueKey: DataKey<T>,
	assign: (value: number) => number | null,
): (number | null)[] {
	const byRegion = new Map(data.map((datum) => [String(datum[regionKey]), datum]))

	return regionIds.map((id) => {
		const datum = byRegion.get(id)

		if (datum == null) return null

		return assign(toBinnableNumber(datum[valueKey]))
	})
}

/**
 * Each region's own formatted value: the row whose `regionKey` matches the
 * region takes its `valueKey` value through `format`; `null` where no row
 * matches or the value is non-finite. Index-aligned with `regionIds`. The
 * tooltip and table read a region's precise value from here, not the bin's
 * range label — the region reads the same colour bin as its neighbours in the
 * bucket, but its readout is its own total.
 *
 * @internal
 */
export function regionValueLabels<T>(
	regionIds: string[],
	data: T[],
	regionKey: DataKey<T>,
	valueKey: DataKey<T>,
	format: (value: number) => string,
): (string | null)[] {
	const byRegion = new Map(data.map((datum) => [String(datum[regionKey]), datum]))

	return regionIds.map((id) => {
		const datum = byRegion.get(id)

		if (datum == null) return null

		const value = toBinnableNumber(datum[valueKey])

		return Number.isFinite(value) ? format(value) : null
	})
}
