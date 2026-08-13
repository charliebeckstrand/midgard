// @vitest-environment node

import { bench, describe } from 'vitest'
import { emitRegionPaths, projectAtlas } from '../modules/map/engine/map-geometry/projected'
import { regionPaths } from '../modules/map/engine/map-geometry/region'
import { canonicalFit, scaleCanonicalFit } from '../modules/map/engine/map-projection/fit'
import { regionCategoryIndexes, resolveCategories } from '../modules/map/engine/map-region/category'
import { regionValueJoin, resolveValueBins } from '../modules/map/engine/map-region/value'
import {
	countiesAtlas,
	makeValues,
	makeZones,
	statesAtlas,
	VALUE_RAMP,
} from './browser/map-fixtures'

/**
 * The map's pure compute: the projection fit, and the joins that decide every
 * region's colour. `map-render.bench.tsx` times the React mount and its
 * static-geometry cache one rung up; the competitive browser suite scores the
 * module against Highcharts Maps and ECharts one rung above that. This one
 * isolates the passes underneath both — each linear in the region count, and a
 * counties atlas carries 3,108 of them, so a per-region constant is worth
 * three thousand of itself on every mount.
 *
 * Node env, no DOM. The atlases and datasets are the same LCG-seeded fixtures
 * the competitive suite draws, so these numbers sit directly under its
 * scenarios.
 */

// Each atlas already carries its decoded features (`prepareAtlas` in
// `browser/map-fixtures.ts`); decoding them again here would re-walk every arc
// of the 3,108 counties at collection for no new data. Its datasets are built
// once too — a counties `makeZones` allocates four 3,108-element arrays, and
// three describes below want the same one.
const ATLASES = [
	{
		label: 'states (49 regions)',
		atlas: statesAtlas,
		zones: makeZones(statesAtlas),
		values: makeValues(statesAtlas),
	},
	{
		label: 'counties (3,108 regions)',
		atlas: countiesAtlas,
		zones: makeZones(countiesAtlas),
		values: makeValues(countiesAtlas),
	},
] as const

describe('map-projection · canonicalFit (the uncached fit)', () => {
	// Re-projects every coordinate of every geography to measure the fitted
	// bounds. Paid once per atlas per projection and then held by the
	// static-geometry cache — but a cache miss pays it on the mount critical
	// path, and the counties atlas is where that hurts.
	for (const { label, atlas } of ATLASES) {
		bench(`${label} · albers-usa`, () => {
			canonicalFit('albers-usa', atlas.geoJson.features)
		})
	}
})

// Each atlas fitted once for every describe below that draws from a fit. The
// counties fit runs to ~100 ms, and three bars want it — measuring it is
// `canonicalFit`'s own bar above, so paying it again per describe would only
// slow collection.
const FITTED = ATLASES.map(({ label, atlas }) => {
	const canonical = canonicalFit('albers-usa', atlas.geoJson.features)

	if (!canonical) throw new Error('fixture yielded no fit')

	return { label, features: atlas.geoJson.features, canonical }
})

describe('map-projection · scaleCanonicalFit (every resize frame)', () => {
	// The refit a resize runs: pure arithmetic over the cached canonical
	// parameters, deliberately avoiding the bounds pass `canonicalFit` above
	// takes. Against that bar it is the whole point of the canonical cache, and
	// it must stay flat in the region count — it never touches a coordinate.
	for (const { label, canonical } of FITTED) {
		bench(`${label} · refit to 960×600`, () => {
			scaleCanonicalFit('albers-usa', canonical, 960, 600)
		})
	}
})

describe('map-geometry · region paths (the mount’s largest pass)', () => {
	// A map draws the atlas under two fits in one mount — canonical on the first
	// commit, measured a beat later — and under another on every resize. The
	// direct walk streams every coordinate through d3-geo each time; the buffer
	// pays that walk once and emits the strings from it, which is the whole of
	// what a refit and a resize then cost.
	for (const { label, features, canonical } of FITTED) {
		const measured = scaleCanonicalFit('albers-usa', canonical, 800, 450)

		const buffer = projectAtlas(features, canonical.projection)

		if (!buffer) throw new Error('fixture yielded no projected atlas')

		bench(`${label} · regionPaths (the direct walk, per fit)`, () => {
			regionPaths(features, measured)
		})

		bench(`${label} · projectAtlas (the walk, once per atlas)`, () => {
			projectAtlas(features, canonical.projection)
		})

		bench(`${label} · emitRegionPaths (per fit, from the buffer)`, () => {
			emitRegionPaths(buffer, measured)
		})
	}
})

describe('map-region/category · resolveCategories (derive + paint)', () => {
	// One pass to dedupe the dataset's categories in first-appearance order, then
	// one paint lookup per category. Linear in the rows; the category count stays
	// small, so this is the rows' term of a categorical mount.
	for (const { label, zones } of ATLASES) {
		bench(`${label} · derived (no explicit list)`, () => {
			resolveCategories(zones.rows, 'zone')
		})
	}

	// An explicit category list skips the derive pass entirely — the difference
	// is what a consumer buys by declaring its categories up front.
	const counties = ATLASES[1]

	const explicit = resolveCategories(counties.zones.rows, 'zone').map(({ value, label }) => ({
		value,
		label,
	}))

	bench(`${counties.label} · explicit list`, () => {
		resolveCategories(counties.zones.rows, 'zone', explicit)
	})
})

describe('map-region/category · regionCategoryIndexes (the categorical join)', () => {
	// Builds a region → row Map and a category → index Map, then walks the
	// regions. Two allocations plus a lookup per region, on every mount and
	// every data update — the pass that turns rows into fills.
	for (const { label, atlas, zones } of ATLASES) {
		const categories = resolveCategories(zones.rows, 'zone')

		bench(label, () => {
			regionCategoryIndexes(atlas.ids, zones.rows, 'fips', 'zone', categories)
		})
	}
})

/** The choropleth scale options both value benches resolve through. */
const SCALE = {
	colorRange: VALUE_RAMP,
	format: (value: number) => value.toFixed(0),
}

describe('map-region/value · resolveValueBins (linear vs quantile)', () => {
	// Equal-interval binning reads the extent in one pass; quantile binning sorts
	// the values to cut by rank, so it carries an O(n log n) term the linear mode
	// does not. The gap is what a consumer pays for the reading that suits
	// skewed data.
	for (const { label, values } of ATLASES) {
		for (const binning of ['linear', 'quantile'] as const) {
			bench(`${label} · ${binning}`, () => {
				resolveValueBins(values.rows, 'value', { ...SCALE, binning })
			})
		}
	}
})

describe('map-region/value · regionValueJoin (the numeric join)', () => {
	// The choropleth's per-region pass: bin assignment, a formatted readout
	// string, and the raw number, for every region. The format call allocates a
	// string per region whether or not a tooltip ever shows it — 3,108 of them on
	// a counties mount, and again on every data update.
	// Both formatters are hoisted, so the pair differs only in the formatter's own
	// cost — a closure rebuilt per iteration on one bar would tilt the comparison.
	const intl = new Intl.NumberFormat('en-US')

	const intlFormat = (value: number) => intl.format(value)

	for (const { label, atlas, values } of ATLASES) {
		const { assign } = resolveValueBins(values.rows, 'value', SCALE)

		for (const [readout, format] of [
			['toFixed', SCALE.format],
			['Intl', intlFormat],
		] as const) {
			bench(`${label} · ${readout} readout`, () => {
				regionValueJoin(atlas.ids, values.rows, 'fips', 'value', assign, format)
			})
		}
	}
})
