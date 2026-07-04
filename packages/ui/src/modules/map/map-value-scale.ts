/**
 * Pure value plumbing for the map's numeric (choropleth) mode: quantising a
 * `valueKey` into equal-interval bins and painting each bin a colour sampled
 * from the consumer's `colorRange`. The numeric analogue of `map-categories`,
 * emitting the same {@link MapCategoryMeta} shape (a `value`-kind paint) so the
 * region fills, legend, tooltip, and table read it unchanged.
 *
 * `colorRange` is an ordered list of CSS colour stops, low → high — the
 * data-driven scale the consumer owns (mirrors AG Charts / ECharts / Vega).
 * Bins default to one per stop (each stop is a class); an explicit `bins` count
 * resamples the stops by interpolating between them in sRGB.
 */

import type { MapCategoryMeta } from './map-categories'
import type { DataKey } from './types'

/** Parse `#rgb` / `#rrggbb` → `[r, g, b]` (0–255). */
function parseHex(hex: string): [number, number, number] {
	const h = hex.replace('#', '')

	const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h

	return [
		Number.parseInt(full.slice(0, 2), 16),
		Number.parseInt(full.slice(2, 4), 16),
		Number.parseInt(full.slice(4, 6), 16),
	]
}

/**
 * The colour `t` (0–1) of the way along the ordered `stops`, interpolated in
 * sRGB. An exact stop passes through verbatim, so any CSS colour works when the
 * sample lands on one (bins = stops); interpolation between stops assumes hex.
 */
export function sampleRange(stops: string[], t: number): string {
	const first = stops[0] ?? '#000000'

	if (stops.length === 1) return first

	const pos = Math.min(1, Math.max(0, t)) * (stops.length - 1)

	const index = Math.min(stops.length - 2, Math.floor(pos))

	const frac = pos - index

	const lo = stops[index] ?? first

	if (frac === 0) return lo

	const hi = stops[index + 1] ?? lo

	if (frac === 1) return hi

	const [r1, g1, b1] = parseHex(lo)
	const [r2, g2, b2] = parseHex(hi)

	const mix = (a: number, b: number): number => Math.round(a + (b - a) * frac)

	return `rgb(${mix(r1, r2)} ${mix(g1, g2)} ${mix(b1, b2)})`
}

/** `n` colours evenly sampled from `colorRange`, low → high. */
function binColors(colorRange: string[], n: number): string[] {
	if (n <= 1) return [sampleRange(colorRange, 0)]

	return Array.from({ length: n }, (_, i) => sampleRange(colorRange, i / (n - 1)))
}

/** The numeric extent of `valueKey` across the rows, or the explicit domain; `null` when no row carries a finite value. */
function valueDomain<T>(
	data: T[],
	valueKey: DataKey<T>,
	explicit?: [number, number],
): [number, number] | null {
	if (explicit) return explicit

	const values = data
		.map((datum) => Number(datum[valueKey]))
		.filter((value) => Number.isFinite(value))

	if (values.length === 0) return null

	return [Math.min(...values), Math.max(...values)]
}

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
	const resolved = valueDomain(data, valueKey, domain)

	if (resolved === null) return { metas: [], domain: null }

	const [min, max] = resolved

	const count = Math.max(1, bins ?? colorRange.length)

	const step = (max - min) / count

	const metas = binColors(colorRange, count).map((color, bin): MapCategoryMeta => {
		const low = min + bin * step

		const high = bin === count - 1 ? max : min + (bin + 1) * step

		const label = step > 0 ? `${format(low)}–${format(high)}` : format(min)

		return { value: String(bin), label, paint: { kind: 'value', color } }
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

	const [min, max] = domain

	const span = max - min

	return regionIds.map((id) => {
		const datum = byRegion.get(id)

		if (datum == null) return null

		const value = Number(datum[valueKey])

		if (!Number.isFinite(value)) return null

		if (span <= 0) return 0

		return Math.min(bins - 1, Math.max(0, Math.floor(((value - min) / span) * bins)))
	})
}
