// @vitest-environment node

import { bench, describe } from 'vitest'
import { regionCategoryIndexes, resolveCategories } from '../modules/map/map-categories'
import { geographyFeatures } from '../modules/map/map-geometry'
import { canonicalFit, mapAutoAspect, scaleCanonicalFit } from '../modules/map/map-projection'
import { regionValueJoin, resolveValueBins } from '../modules/map/map-value-scale'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './browser/map-fixtures'

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

const states = geographyFeatures(statesAtlas.topology, 'states')

const counties = geographyFeatures(countiesAtlas.topology, 'counties')

const ATLASES = [
	{ label: 'states (49 regions)', atlas: statesAtlas, features: states },
	{ label: 'counties (3,108 regions)', atlas: countiesAtlas, features: counties },
] as const

describe('map-projection · canonicalFit (the uncached fit)', () => {
	// Re-projects every coordinate of every geography to measure the fitted
	// bounds. Paid once per atlas per projection and then held by the
	// static-geometry cache — but a cache miss pays it on the mount critical
	// path, and the counties atlas is where that hurts.
	for (const { label, features } of ATLASES) {
		bench(`${label} · albers-usa`, () => {
			canonicalFit('albers-usa', features)
		})
	}
})

describe('map-projection · scaleCanonicalFit (every resize frame)', () => {
	// The refit a resize runs: pure arithmetic over the cached canonical
	// parameters, deliberately avoiding the bounds pass `canonicalFit` above
	// takes. Against that bar it is the whole point of the canonical cache, and
	// it must stay flat in the region count — it never touches a coordinate.
	for (const { label, features } of ATLASES) {
		const canonical = canonicalFit('albers-usa', features)

		if (!canonical) throw new Error('fixture yielded no fit')

		bench(`${label} · refit to 960×600`, () => {
			scaleCanonicalFit('albers-usa', canonical, 960, 600)
		})
	}
})

describe('map-projection · mapAutoAspect (the CSS reservation)', () => {
	// Resolved before the first paint so the figure reserves its box without a
	// measurement — on the mount critical path, ahead of everything else here.
	for (const { label, features } of ATLASES) {
		bench(`${label} · albers-usa`, () => {
			mapAutoAspect('albers-usa', features)
		})
	}
})

describe('map-categories · resolveCategories (derive + paint)', () => {
	// One pass to dedupe the dataset's categories in first-appearance order, then
	// one paint lookup per category. Linear in the rows; the category count stays
	// small, so this is the rows' term of a categorical mount.
	for (const { label, atlas } of ATLASES) {
		const { rows } = makeZones(atlas)

		bench(`${label} · derived (no explicit list)`, () => {
			resolveCategories(rows, 'zone')
		})
	}

	// An explicit category list skips the derive pass entirely — the difference
	// is what a consumer buys by declaring its categories up front.
	const { rows } = makeZones(countiesAtlas)

	const explicit = resolveCategories(rows, 'zone').map(({ value, label }) => ({ value, label }))

	bench('counties (3,108 regions) · explicit list', () => {
		resolveCategories(rows, 'zone', explicit)
	})
})

describe('map-categories · regionCategoryIndexes (the categorical join)', () => {
	// Builds a region → row Map and a category → index Map, then walks the
	// regions. Two allocations plus a lookup per region, on every mount and
	// every data update — the pass that turns rows into fills.
	for (const { label, atlas } of ATLASES) {
		const { rows } = makeZones(atlas)

		const categories = resolveCategories(rows, 'zone')

		bench(label, () => {
			regionCategoryIndexes(atlas.ids, rows, 'fips', 'zone', categories)
		})
	}
})

/** The choropleth scale options both value benches resolve through. */
const SCALE = {
	colorRange: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
	format: (value: number) => value.toFixed(0),
}

describe('map-value-scale · resolveValueBins (linear vs quantile)', () => {
	// Equal-interval binning reads the extent in one pass; quantile binning sorts
	// the values to cut by rank, so it carries an O(n log n) term the linear mode
	// does not. The gap is what a consumer pays for the reading that suits
	// skewed data.
	for (const { label, atlas } of ATLASES) {
		const { rows } = makeValues(atlas)

		bench(`${label} · linear`, () => {
			resolveValueBins(rows, 'value', { ...SCALE, binning: 'linear' })
		})

		bench(`${label} · quantile`, () => {
			resolveValueBins(rows, 'value', { ...SCALE, binning: 'quantile' })
		})
	}
})

describe('map-value-scale · regionValueJoin (the numeric join)', () => {
	// The choropleth's per-region pass: bin assignment, a formatted readout
	// string, and the raw number, for every region. The format call allocates a
	// string per region whether or not a tooltip ever shows it — 3,108 of them on
	// a counties mount, and again on every data update.
	for (const { label, atlas } of ATLASES) {
		const { rows } = makeValues(atlas)

		const { assign } = resolveValueBins(rows, 'value', SCALE)

		const intl = new Intl.NumberFormat('en-US')

		bench(`${label} · toFixed readout`, () => {
			regionValueJoin(atlas.ids, rows, 'fips', 'value', assign, SCALE.format)
		})

		bench(`${label} · Intl readout`, () => {
			regionValueJoin(atlas.ids, rows, 'fips', 'value', assign, (value) => intl.format(value))
		})
	}
})
