import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint, MapRoute } from '../../modules/map'
import {
	GEOFENCE_STROKE_WIDTH,
	POINT_RADIUS,
	REGION_STROKE_WIDTH,
	ROUTE_STROKE_WIDTH,
} from '../../modules/map/engine/map-constants'
import { bySlot, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { firstRegion } from '../helpers/map-queries'
import { zoomToCeiling } from './helpers/map-zoom'

/** What one user unit spans on screen where `element` draws. */
function screenScale(element: SVGGraphicsElement): number {
	const ctm = element.getScreenCTM()

	if (ctm === null) throw new Error('expected a screen CTM')

	return ctm.a
}

/**
 * The width the browser will paint `element`'s stroke at, in CSS pixels: the
 * used width — inherited or stated — through the transform it draws under.
 */
function drawnWidth(element: SVGGraphicsElement): number {
	return Number.parseFloat(getComputedStyle(element).strokeWidth) * screenScale(element)
}

/** A zooming plat carrying one of each mark that strokes. */
function marked() {
	return renderUI(
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom>
			<MapGeofence label="Catchment" at={[15, 5]} radius={300_000} />

			<MapRoute
				label="Line haul"
				stops={[
					[8, 5],
					[15, 5],
				]}
			/>

			<MapPoint label="Depot" at={[15, 5]} />
		</MapPlat>,
	)
}

/**
 * Every mark spec in this module is a device-pixel figure, and the marks draw in
 * frame units — so between the two sits one multiply, and this file is what
 * checks the browser agrees with it. `MapDot` records why the module owns that
 * multiply rather than asking the browser for it through a `vector-effect`.
 *
 * jsdom can state the attributes and no more (`modules/map-plat-zoom` pins
 * those). Only a real engine resolves an inherited presentation attribute, a
 * used stroke width, and the CTM a mark actually draws under — which is what
 * every case below reads.
 *
 * What is still not covered here: the dash. `isPointInStroke` ignores the dash
 * pattern, and `getBoundingClientRect` on an SVG shape reports geometry without
 * the stroke, so a half-drawn route measures the same as a whole one from
 * script. The vector-effect case stands in for it — the dash only ever
 * truncated under one.
 */
describe('map stroke width through the view', () => {
	it('draws every mark at its device-pixel spec, at every scale the view takes', () => {
		const { container } = marked()

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		const specs = [
			['map-point', POINT_RADIUS * 2],
			['map-route', ROUTE_STROKE_WIDTH],
			['map-geofence', GEOFENCE_STROKE_WIDTH],
		] as const

		const marks = specs.map(([slot]) => present<SVGGraphicsElement>(bySlot(container, slot), slot))

		const gauge = present<SVGGraphicsElement>(bySlot(container, 'map-point'), 'map-point')

		const scales = [screenScale(gauge)]

		const samples = marks.map((mark) => [drawnWidth(mark)])

		// One sweep for all three, because the view does not reset between sweeps:
		// a second pass over the same plat would start at the ceiling and measure
		// the same scale five times over — which is what a sweep per mark did, so
		// two of the three marks were only ever read at the ceiling.
		zoomToCeiling(plot, () => {
			scales.push(screenScale(gauge))

			for (const [index, mark] of marks.entries()) samples[index]?.push(drawnWidth(mark))
		})

		// The sweep has to have swept, or every assertion below reads one scale.
		expect(scales[0]).toBeCloseTo(1, 1)

		expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(4)

		specs.forEach(([slot, spec], index) => {
			// Sampled through the sweep rather than at its ends, so a mark that holds
			// at rest and at the ceiling but swells between them still fails. The
			// ceiling is eightfold: a mark that rode the transform would leave this
			// loop 8px per authored pixel.
			for (const width of samples[index] ?? []) expect(width, slot).toBeCloseTo(spec, 1)
		})
	})

	it('holds the region seam at one device pixel, on a width no path states', () => {
		const { container } = marked()

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		const region = present<SVGGraphicsElement>(firstRegion(container), 'a region path')

		// The seam is inherited from the layer's own group, so this reads the whole
		// mechanism at once: the attribute resolves down through the zoom, and the
		// scale under it divides back out.
		expect(region.getAttribute('stroke-width')).toBeNull()

		const widths = [drawnWidth(region)]

		zoomToCeiling(plot, () => widths.push(drawnWidth(region)))

		for (const width of widths) expect(width).toBeCloseTo(REGION_STROKE_WIDTH, 1)
	})

	it('leaves the drawn width to the transform, with no vector effect over it', () => {
		const { container } = marked()

		// The case above cannot catch this on its own: a `vector-effect` changes
		// what the browser paints while leaving the computed width and the CTM it
		// multiplies exactly as they are. It would also take the route's reveal with
		// it, since a `pathLength` dash under one covers 1/k of its path. Read
		// computed, so a class that reintroduced it fails here too.
		for (const slot of ['map-point', 'map-route', 'map-geofence']) {
			const mark = present(bySlot(container, slot), slot)

			expect(getComputedStyle(mark).vectorEffect, slot).toBe('none')
		}

		expect(getComputedStyle(present(firstRegion(container), 'a region path')).vectorEffect).toBe(
			'none',
		)
	})

	it('draws the dot at the radius its cap claims, not merely the width it states', () => {
		const { container } = marked()

		const dot = present<SVGGeometryElement>(bySlot(container, 'map-point'), 'map-point')

		// The dot is a zero-length subpath, so its only point is its centre — and
		// the cap the browser builds around that point is the whole of the mark.
		// Its own stroke geometry is therefore the last word on how big the dot is,
		// where a radius derived from the stated width would agree with itself even
		// if the cap disagreed. The probe is in the path's own units, so the
		// device-pixel radius divides by what one unit spans.
		const centre = dot.getPointAtLength(0)

		const radius = POINT_RADIUS / screenScale(dot)

		expect(dot.isPointInStroke({ x: centre.x + radius * 0.9, y: centre.y })).toBe(true)

		expect(dot.isPointInStroke({ x: centre.x + radius * 1.1, y: centre.y })).toBe(false)
	})
})
