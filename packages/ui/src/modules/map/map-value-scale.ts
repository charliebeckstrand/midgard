/**
 * Map-shaped adapters over the shared sequential colour scale
 * ({@link ../../utilities/color-scale}): quantise a `valueKey` into
 * equal-interval bins and emit them as the map's {@link MapCategoryMeta} shape
 * (a `value`-kind paint) so the region fills, legend, tooltip, and table read
 * them the way they read categorical slots. The numeric analogue of
 * `map-categories`. The colour maths itself — sampling the ramp, binning the
 * domain — lives in the shared utility, so the choropleth and the heatmap share
 * one scale.
 */

import { binIndex, resolveColorBins, valueExtent } from '../../utilities'
import type { MapCategoryMeta } from './map-categories'
import type { DataKey } from './types'

export { sampleRange } from '../../utilities'

/** Options a choropleth resolves its bins with. @internal */
export type ValueScaleOptions = {
	/** The ordered CSS colour stops the bins sample, low → high. */
	colorRange: string[]
	/** Equal-interval bin count; defaults to one bin per colour stop. */
	bins?: number
	/** Fixed `[min, max]`; derived from the data extent when omitted. */
	domain?: [number, number]
	/** Formats the bin-range endpoints for the legend and table labels. */
	format: (value: number) => string
}

/**
 * Resolves the choropleth bins: one {@link MapCategoryMeta} per equal-interval
 * bucket, labelled by its value range and painted a colour sampled from
 * `colorRange`. Returns the resolved domain so {@link regionValueIndexes} bins
 * against the same extent; empty (with a `null` domain) when no row carries a
 * finite value.
 *
 * @internal
 */
export function resolveValueBins<T>(
	data: T[],
	valueKey: DataKey<T>,
	{ colorRange, bins, domain, format }: ValueScaleOptions,
): { metas: MapCategoryMeta[]; domain: [number, number] | null } {
	const resolved = valueExtent(
		data.map((datum) => Number(datum[valueKey])),
		domain,
	)

	if (resolved === null) return { metas: [], domain: null }

	const metas = resolveColorBins(resolved, colorRange, bins).map((bin, index): MapCategoryMeta => {
		const label = bin.hi > bin.lo ? `${format(bin.lo)}–${format(bin.hi)}` : format(bin.lo)

		return { value: String(index), label, paint: { kind: 'value', color: bin.color } }
	})

	return { metas, domain: resolved }
}

/**
 * Matches each region to its bin: the row whose `regionKey` equals the region's
 * id is placed by its `valueKey` into one of `bins` equal-interval buckets of
 * the domain. `null` where no row matches, the value is non-finite, or there is
 * no domain — the region draws in the neutral no-data fill.
 *
 * @internal
 */
export function regionValueIndexes<T>(
	regionIds: string[],
	data: T[],
	regionKey: DataKey<T>,
	valueKey: DataKey<T>,
	bins: number,
	domain: [number, number] | null,
): (number | null)[] {
	if (domain === null || bins < 1) return regionIds.map(() => null)

	const byRegion = new Map(data.map((datum) => [String(datum[regionKey]), datum]))

	return regionIds.map((id) => {
		const datum = byRegion.get(id)

		if (datum == null) return null

		return binIndex(Number(datum[valueKey]), domain, bins)
	})
}
