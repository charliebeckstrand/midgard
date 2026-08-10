import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint, MapRoute } from '../../modules/map'
import {
	GEOFENCE_STROKE_WIDTH,
	MAP_ZOOM_MAX,
	MAP_ZOOM_STEP,
	POINT_RADIUS,
	REGION_STROKE_WIDTH,
	ROUTE_STROKE_WIDTH,
} from '../../modules/map/engine/map-constants'
import { bySlot, fireEvent, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * Every mark spec in this module is a device-pixel figure, and the marks draw in
 * frame units — so between the two sits one multiply, and this file is what
 * checks the browser agrees with it.
 *
 * The module asked the browser for that conversion once, through
 * `vector-effect="non-scaling-stroke"`. That put the drawn size of every mark on
 * a stroke transform no test could see and no code here could reach: Chrome 151
 * and 152 leave the display's scale factor in it and paint every non-scaling
 * stroke at half width, and a `pathLength` dash under one draws 1/k of its path
 * at every version — so a zoomed route lost its far end. Owning the multiply is
 * what makes the size assertable, and these are the assertions.
 *
 * jsdom can state the attributes and no more (`modules/map-plat-zoom` pins
 * those). Only a real engine resolves an inherited presentation attribute, a
 * used stroke width, and the CTM a mark actually draws under — which is what
 * every case below reads.
 *
 * What is still not covered here: the dash. `isPointInStroke` ignores the dash
 * pattern, and `getBoundingClientRect` on an SVG shape reports geometry without
 * the stroke, so a half-drawn route measures the same as a whole one from
 * script. The vector-effect assertions stand in for it — the dash only ever
 * truncated under one.
 */

/**
 * `present` for the SVG shapes this file measures. The shared helper answers an
 * `HTMLElement`, which every other suite can live with and none of the geometry
 * below can: a CTM and a stroke's own point test are SVG interfaces.
 */
function shape<T extends SVGGraphicsElement>(el: Element | null | undefined, what: string): T {
	return present(el, what) as Element as T
}

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

/**
 * How many `+` presses reach the zoom ceiling, derived rather than counted, so a
 * softer step or a higher ceiling still sweeps the range — the derivation
 * `map-hit-target-modality` makes for the same reason.
 */
const CEILING_PRESSES = Math.ceil(Math.log(MAP_ZOOM_MAX) / Math.log(MAP_ZOOM_STEP))

/** Zooms a plat to its ceiling from the keyboard, sampling at every step. */
function zoomToCeiling(plot: Element, sample: () => void) {
	for (let press = 0; press < CEILING_PRESSES; press += 1) {
		fireEvent.keyDown(plot, { key: '+' })

		sample()
	}
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

describe('map stroke width through the view', () => {
	it('draws every mark at its device-pixel spec, at every scale the view takes', () => {
		const { container } = marked()

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		const specs = [
			['map-point', POINT_RADIUS * 2],
			['map-route', ROUTE_STROKE_WIDTH],
			['map-geofence', GEOFENCE_STROKE_WIDTH],
		] as const

		for (const [slot, spec] of specs) {
			const mark = shape(bySlot(container, slot), slot)

			const widths = [drawnWidth(mark)]

			zoomToCeiling(plot, () => widths.push(drawnWidth(mark)))

			// Sampled across the sweep rather than at the ends, so a mark that holds
			// at rest and at the ceiling but swells between them still fails. The
			// ceiling is eightfold: a mark that rode the transform would leave this
			// loop 8px per authored pixel.
			for (const width of widths) expect(width).toBeCloseTo(spec, 1)
		}
	})

	it('holds the region seam at one device pixel, on a width it never states', () => {
		const { container } = marked()

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		const region = shape(container.querySelector('[data-region-index]'), 'a region path')

		// The seam is inherited from the group that carries the transform, so this
		// reads the whole mechanism at once: the attribute resolves down through the
		// zoom, and the scale under it divides back out.
		expect(region.getAttribute('stroke-width')).toBeNull()

		const widths = [drawnWidth(region)]

		zoomToCeiling(plot, () => widths.push(drawnWidth(region)))

		for (const width of widths) expect(width).toBeCloseTo(REGION_STROKE_WIDTH, 1)
	})

	it('leaves the drawn width to the transform, with no vector effect over it', () => {
		const { container } = marked()

		// A `vector-effect` anywhere would take the width back off the CTM the cases
		// above measure through — and take the route's reveal with it, since a
		// `pathLength` dash under one covers 1/k of its path. Read computed, so a
		// class that reintroduced it fails here too.
		for (const slot of ['map-point', 'map-route', 'map-geofence']) {
			const mark = shape(bySlot(container, slot), slot)

			expect(getComputedStyle(mark).vectorEffect).toBe('none')
		}

		const region = shape(container.querySelector('[data-region-index]'), 'a region path')

		expect(getComputedStyle(region).vectorEffect).toBe('none')
	})

	it('draws the dot at the radius its cap claims, not merely the width it states', () => {
		const { container } = marked()

		const dot = shape<SVGGeometryElement>(bySlot(container, 'map-point'), 'map-point')

		const svg = shape<SVGSVGElement>(container.querySelector('svg'), 'the plot SVG')

		const at = /^M([\d.]+),([\d.]+)l0,0$/.exec(dot.getAttribute('d') ?? '')

		const cx = Number(at?.[1])

		const cy = Number(at?.[2])

		const point = (x: number, y: number) => Object.assign(svg.createSVGPoint(), { x, y })

		// The cap is the dot, so the browser's own stroke geometry is the last word
		// on how big the dot is: inside just under the radius, outside just past it.
		// A drawn radius derived from the stated width alone would agree with itself
		// even if the cap the browser builds disagreed. The probe is in the path's
		// own units, so the device-pixel radius divides by what one unit spans.
		const radius = POINT_RADIUS / screenScale(dot)

		expect(dot.isPointInStroke(point(cx + radius * 0.9, cy))).toBe(true)

		expect(dot.isPointInStroke(point(cx + radius * 1.1, cy))).toBe(false)
	})
})
