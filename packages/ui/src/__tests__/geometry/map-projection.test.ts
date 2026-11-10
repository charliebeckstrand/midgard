// @vitest-environment node
import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import {
	ALBERS_USA_ASPECT,
	MAP_FIT_INSET,
	REGION_PATH_DIGITS,
} from '../../modules/map/engine/map-constants'
import {
	mapFrameSizing,
	projectionFallbackAspect,
} from '../../modules/map/engine/map-projection/aspect'
import { canonicalFit, measuredMapFit } from '../../modules/map/engine/map-projection/fit'
import { frameToClient } from '../../modules/map/engine/map-projection/frame'
import {
	fitWidthFromProbeBounds,
	resolveProjection,
} from '../../modules/map/engine/map-projection/resolve'
import type { LngLat, MapFeature } from '../../modules/map/engine/types'
import { FLOAT } from '../helpers/geometry/tolerance'
import { fitProjection } from '../helpers/map-fit'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The fit centers the geography, so the sum of two opposite edges can miss the
 * frame size by this bound in frame units.
 */
const HALF_FRAME_UNIT = 0.5

/**
 * Adaptive resampling in d3 refines each curve at the scale of its pass, so two
 * fits can differ by one percent of scale.
 */
const RESAMPLE_SCALE_RATIO = 0.01

const FEATURES = FIXTURE_GEOJSON.features

// A triangle inside the lower 48, so the US composite projection has geometry
// it can actually frame (the world fixture sits outside its insets).
const US_FEATURES = [
	{
		type: 'Feature',
		properties: { name: 'Tri-state' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-120, 34],
					[-95, 44],
					[-80, 34],
					[-120, 34],
				],
			],
		},
	},
] as unknown as MapFeature[]

/** Three positions inside {@link FEATURES}, which spans lon 0 to 30 and lat 0 to 10. */
const WORLD_POSITIONS: LngLat[] = [
	[0, 0],
	[15, 5],
	[30, 10],
]

/** The corners of the triangle of {@link US_FEATURES}. */
const US_POSITIONS: LngLat[] = [
	[-120, 34],
	[-95, 44],
	[-80, 34],
]

/** Each named projection, with a geography that it can frame and positions inside that geography. */
const NAMED = [
	['mercator', FEATURES, WORLD_POSITIONS],
	['equal-earth', FEATURES, WORLD_POSITIONS],
	['albers-usa', US_FEATURES, US_POSITIONS],
] as const

describe('resolveProjection', () => {
	it('resolves each built-in name to a fresh projection', () => {
		for (const name of ['mercator', 'albers-usa', 'equal-earth'] as const) {
			const projection = resolveProjection(name)

			expect(typeof projection).toBe('function')

			expect(projection).not.toBe(resolveProjection(name))
		}
	})

	it('passes a d3 projection instance through untouched', () => {
		const instance = geoMercator()

		expect(resolveProjection(instance)).toBe(instance)
	})
})

describe('measuredMapFit', () => {
	// Frames wider and narrower than the geography's own shape, so both
	// letterboxing axes are exercised.
	const frames = [
		[300, 100],
		[240, 240],
		[120, 500],
	] as const

	it.each(NAMED)('frames the geography like a direct fitExtent under %s', (spec, features) => {
		const canonical = canonicalFit(spec, features)

		if (canonical === null) throw new Error('nothing to fit')

		const shape = { type: 'FeatureCollection', features } as const

		for (const [width, height] of frames) {
			const fit = measuredMapFit(spec, canonical, width, height)

			if (fit === null) throw new Error('expected a fit')

			// A named projection draws in the measured frame itself.
			expect(fit.frame).toBeNull()

			const derived = fit.projection

			// The geography sits inside the frame less the inset, centered, filling
			// one axis from inset to inset: the fit contract itself.
			const [[x0, y0], [x1, y1]] = geoPath(derived).bounds(
				shape as unknown as Parameters<ReturnType<typeof geoPath>['bounds']>[0],
			)

			const inset = MAP_FIT_INSET

			expect(x0).toBeGreaterThanOrEqual(inset - 0.5)

			expect(y0).toBeGreaterThanOrEqual(inset - 0.5)

			expect(x1).toBeLessThanOrEqual(width - inset + 0.5)

			expect(y1).toBeLessThanOrEqual(height - inset + 0.5)

			expect(Math.min(width - inset * 2 - (x1 - x0), height - inset * 2 - (y1 - y0))).toBeLessThan(
				1,
			)

			expect(x0 + x1).toBeNear(width, HALF_FRAME_UNIT)

			expect(y0 + y1).toBeNear(height, HALF_FRAME_UNIT)

			// And it lands where a direct fitExtent would, within the sub-percent
			// margin of d3's adaptive resampling, which refines each pass's curves
			// at the scale that pass runs at.
			const direct = fitProjection(spec, features, width, height)

			expect(derived.scale() / direct.scale()).toBeNear(1, RESAMPLE_SCALE_RATIO)
		}
	})

	it.each(NAMED)(
		'carries the canonical drawing onto the measured fit under %s',
		(spec, features, positions) => {
			const canonical = canonicalFit(spec, features)

			if (canonical === null) throw new Error('nothing to fit')

			for (const [width, height] of frames) {
				const fit = measuredMapFit(spec, canonical, width, height)

				if (fit === null) throw new Error('expected a fit')

				// The region layer draws the canonical paths under the carry. Each
				// position must therefore land where the measured projection draws it.
				for (const position of positions) {
					const from = canonical.projection(position)

					const to = fit.projection(position)

					if (from === null || to === null) throw new Error('fixture position has no image')

					expect(from[0] * fit.carry.k + fit.carry.x).toBeNear(to[0], FLOAT)

					expect(from[1] * fit.carry.k + fit.carry.y).toBeNear(to[1], FLOAT)
				}
			}
		},
	)

	it('leaves the cached canonical projection untouched', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const scale = canonical.projection.scale()

		const translate = canonical.projection.translate()

		const fit = measuredMapFit('mercator', canonical, 300, 100)

		expect(fit?.projection).not.toBe(canonical.projection)

		expect(canonical.projection.scale()).toBe(scale)

		expect(canonical.projection.translate()).toEqual(translate)
	})

	it('is null when there is nothing to frame', () => {
		// Empty geography leaves the canonical fit null; a lone-point atlas whose
		// bounds collapse does too. Either way there is no measured fit to derive,
		// so overlays never project through an unfitted default.
		expect(measuredMapFit('mercator', null, 300, 100)).toBeNull()
	})

	it('is null before the frame is measured', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		expect(measuredMapFit('mercator', canonical, 0, 100)).toBeNull()

		expect(measuredMapFit('mercator', canonical, 300, 0)).toBeNull()
	})

	it('is null where the frame has no room inside the inset', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		// A frame of twice the inset, or less, on one axis has no area left for
		// the geography. A fit there would scale it to nothing, or mirror it.
		expect(measuredMapFit('mercator', canonical, 300, MAP_FIT_INSET * 2)).toBeNull()

		expect(measuredMapFit('mercator', canonical, MAP_FIT_INSET * 2, 100)).toBeNull()

		expect(measuredMapFit('mercator', canonical, 300, MAP_FIT_INSET * 2 + 1)).not.toBeNull()
	})

	it('keeps the canonical fit of a passed instance, and frames it per box', () => {
		const instance = geoMercator()

		const canonical = canonicalFit(instance, FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const scale = instance.scale()

		const translate = instance.translate()

		const small = measuredMapFit(instance, canonical, 150, 50)

		const large = measuredMapFit(instance, canonical, 600, 200)

		if (small?.frame == null || large?.frame == null) throw new Error('expected a framed fit')

		// The instance belongs to the consumer, and a refit in place would give both
		// fits one identity. Each box takes its own frame over the canonical fit:
		// the scale that meets the box less the inset on each side.
		expect(instance.scale()).toBe(scale)

		expect(instance.translate()).toEqual(translate)

		expect(small.projection).toBe(canonical.projection)

		const meet = (width: number, height: number) =>
			Math.min(
				(width - MAP_FIT_INSET * 2) / canonical.width,
				(height - MAP_FIT_INSET * 2) / canonical.height,
			)

		expect(small.frame.k).toBeNear(meet(150, 50), FLOAT)

		expect(large.frame.k).toBeNear(meet(600, 200), FLOAT)

		// The projection stays canonical, so the frame over its output is also the
		// carry of the canonical paths.
		expect(small.carry).toEqual(small.frame)

		expect(large.carry).toEqual(large.frame)
	})

	it('puts a passed instance where a named projection puts the same geography', () => {
		const named = canonicalFit('mercator', FEATURES)

		const passed = canonicalFit(geoMercator(), FEATURES)

		if (named === null || passed === null) throw new Error('nothing to fit')

		const a = measuredMapFit('mercator', named, 300, 160)

		const b = measuredMapFit(passed.projection, passed, 300, 160)

		if (a === null || b?.frame == null) throw new Error('expected a fit')

		const at: [number, number] = [10, 5]

		const [ax, ay] = a.projection(at) ?? [Number.NaN, Number.NaN]

		const [bx, by] = b.projection(at) ?? [Number.NaN, Number.NaN]

		expect(bx * b.frame.k + b.frame.x).toBeNear(ax, FLOAT)

		expect(by * b.frame.k + b.frame.y).toBeNear(ay, FLOAT)
	})
})

describe('canonicalFit · the reserved aspect', () => {
	it('measures the projected width / height ratio', () => {
		const aspect = canonicalFit('mercator', FEATURES)?.aspect

		// 30° wide by 10° tall near the equator: roughly 3:1 under mercator.
		expect(aspect).toBeGreaterThan(2.5)

		expect(aspect).toBeLessThan(3.5)
	})

	it('is null with no features to measure', () => {
		expect(canonicalFit('mercator', [])).toBeNull()
	})

	// The server and the browser write the frame into the markup. The last bits
	// of a projected value are not the same in each JavaScript engine, and a
	// value on the path grid is.
	it.each(['mercator', 'equal-earth'] as const)(
		'puts the %s frame height on the path grid',
		(spec) => {
			const height = canonicalFit(spec, FEATURES)?.height

			expect(height).toBeDefined()

			expect(Number(height?.toFixed(REGION_PATH_DIGITS))).toBe(height)
		},
	)
})

describe('fitWidthFromProbeBounds', () => {
	it('reports no height where the span rounds to zero on the path grid', () => {
		// A span of 0.0001 probe units fits to 0.0007 frame units at width 1000,
		// under the grid's 0.1. A height of 0 would reserve an infinite aspect.
		expect(fitWidthFromProbeBounds(geoMercator(), 0, 0, 150, 0.0001, 1000)).toBeNull()
	})

	it('reports no height where the span collapses', () => {
		expect(fitWidthFromProbeBounds(geoMercator(), 0, 0, 150, 0, 1000)).toBeNull()

		expect(fitWidthFromProbeBounds(geoMercator(), 0, 0, 0, 150, 1000)).toBeNull()
	})
})

describe('projectionFallbackAspect', () => {
	it('reserves the US ratio for albers-usa before its geography loads', () => {
		expect(projectionFallbackAspect('albers-usa')).toBe(ALBERS_USA_ASPECT)
	})

	it('has none for the world projections', () => {
		expect(projectionFallbackAspect('mercator')).toBeNull()

		expect(projectionFallbackAspect('equal-earth')).toBeNull()
	})
})

describe('mapFrameSizing', () => {
	it.for<{
		name: string
		height: number | undefined
		ratio: Parameters<typeof mapFrameSizing>[1]
		aspect: number | null
		sizing: ReturnType<typeof mapFrameSizing>
	}>([
		{
			name: 'lets an explicit height win as a fixed pixel box',
			height: 250,
			ratio: 'auto',
			aspect: 3,
			sizing: { mode: 'fixed', height: 250 },
		},
		{
			name: "derives the geography's own ratio under 'auto'",
			height: undefined,
			ratio: 'auto',
			aspect: 3,
			sizing: { mode: 'aspect', ratio: 3 },
		},
		{
			name: "falls back to a wide frame when 'auto' has nothing to measure",
			height: undefined,
			ratio: 'auto',
			aspect: null,
			sizing: { mode: 'aspect', ratio: 16 / 9 },
		},
		{
			name: 'parses a "w/h" ratio string',
			height: undefined,
			ratio: '4/3',
			aspect: null,
			sizing: { mode: 'aspect', ratio: 4 / 3 },
		},
		{
			name: "fills the container only when free-form — 'auto' never falls through",
			height: undefined,
			ratio: false,
			aspect: 3,
			sizing: { mode: 'fill' },
		},
		{
			// The `${number}/${number}` type admits a signed numerator, so a negative
			// ratio must fall through to fill, not produce an invalid CSS aspect-ratio.
			name: 'rejects a negative "w/h" ratio, filling rather than reserving a negative box',
			height: undefined,
			ratio: '-4/3',
			aspect: null,
			sizing: { mode: 'fill' },
		},
	])('$name', ({ height, ratio, aspect, sizing }) => {
		expect(mapFrameSizing(height, ratio, aspect)).toEqual(sizing)
	})
})

describe('frameToClient', () => {
	const box = { left: 100, top: 50, width: 400, height: 200 }

	it('maps a frame point through a box the view frame fills exactly', () => {
		// Measured state: the viewBox matches the box, so the scale is 1 and only
		// the box's own offset applies.
		expect(frameToClient({ x: 10, y: 20 }, box, 400, 200)).toEqual({ x: 110, y: 70 })
	})

	it('scales when the view frame is a different size than the box', () => {
		expect(frameToClient({ x: 100, y: 50 }, box, 800, 400)).toEqual({ x: 150, y: 75 })
	})

	it('centers the letterbox, the SVG default preserveAspectRatio', () => {
		// Canonical state: a 400x100 view frame inside a 400x200 box fits at scale
		// 1 and centers, leaving 50px of gap above it.
		expect(frameToClient({ x: 0, y: 0 }, box, 400, 100)).toEqual({ x: 100, y: 100 })

		// A frame narrower than the box fits on its height (scale 1, not 4) and
		// centers horizontally, leaving 150px of gap either side.
		expect(frameToClient({ x: 0, y: 0 }, box, 100, 200)).toEqual({ x: 250, y: 50 })
	})

	it('reports nothing for a box or a view frame with no area', () => {
		expect(frameToClient({ x: 0, y: 0 }, { ...box, width: 0 }, 400, 200)).toBeNull()

		expect(frameToClient({ x: 0, y: 0 }, box, 0, 200)).toBeNull()

		expect(frameToClient({ x: 0, y: 0 }, box, 400, 0)).toBeNull()
	})
})
