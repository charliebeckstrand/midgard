import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import {
	MAP_ZOOM_MAX,
	MAP_ZOOM_STEP,
	POINT_HIT_RADIUS,
	POINT_HIT_RADIUS_FINE,
} from '../../modules/map/engine/map-constants'
import { allBySlot, bySlot, fireEvent, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** The centre of an element's box, in client coordinates. */
function centreOf(element: Element) {
	const box = element.getBoundingClientRect()

	return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** The drawn radius of a hit circle, which its box is twice. */
function radiusOf(element: Element) {
	return element.getBoundingClientRect().width / 2
}

/**
 * How many `+` presses reach the zoom ceiling, derived rather than counted, so a
 * softer step or a higher ceiling still sweeps the whole range these cases claim.
 */
const CEILING_PRESSES = Math.ceil(Math.log(MAP_ZOOM_MAX) / Math.log(MAP_ZOOM_STEP))

/** Zooms a plat to its ceiling from the keyboard. */
function zoomToCeiling(plot: Element, onStep?: () => void) {
	for (let press = 0; press < CEILING_PRESSES; press += 1) {
		fireEvent.keyDown(plot, { key: '+' })

		onStep?.()
	}
}

/**
 * The fine-pointer hit target, in a real browser (Vitest browser mode drives
 * Chromium with a mouse, so `pointer: fine` matches here and the jsdom suite can
 * resolve neither the media query nor a CSS `r`).
 *
 * Two things could break this silently and neither shows up in a unit test:
 * Tailwind failing to emit the arbitrary `[r:…]` property, and a browser
 * dropping CSS geometry properties on SVG shapes. Either would put every dot
 * back to the finger-sized target, and a `MapGeofence` drawn tight around a
 * `MapPoint` would stop answering the mouse.
 *
 * Some cases probe what the pointer actually lands on rather than what the target
 * computes to, the way `grid-target-size` does: a real layout engine is the only
 * thing that can resolve one target through another.
 *
 * The relations between the two radii, and which dots earn the narrower one, are
 * pinned in jsdom (`modules/map-hit-target`); this file says what only a browser
 * can — so every case here puts something under the dot that the narrower target
 * is for.
 */
describe('dot hit target by pointer modality', () => {
	it('resolves to the fine target while the coarse reach stays on the attribute', () => {
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapGeofence label="Catchment" at={[8, 5]} radius={300_000} />

				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = present(bySlot(document.body, 'map-point-hit'), 'point hit target')

		// The attribute is the fallback a browser without CSS `r` keeps.
		expect(hit.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		// The used value is what hit-testing reads — and what the class sets.
		// `SVGCircleElement.r.baseVal` reflects the attribute, so it cannot say this.
		expect(getComputedStyle(hit).r).toBe(`${POINT_HIT_RADIUS_FINE}px`)
	})

	it('resolves to the coarse reach where nothing stands under the dot', () => {
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = present(bySlot(document.body, 'map-point-hit'), 'point hit target')

		// No class to narrow it, so the used value is the attribute's own: a mouse
		// gets the same reach a finger does where the pixels have nowhere to go.
		expect(getComputedStyle(hit).r).toBe(`${POINT_HIT_RADIUS}px`)
	})

	it('leaves a depot at a catchment’s centre pointing at the zone a few pixels out', () => {
		renderUI(
			// The demo's own shape: the zone draws first, so the depot's target paints
			// over it and whatever that target does not claim falls through to the zone.
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapGeofence label="Catchment" at={[15, 5]} radius={300_000} />

				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const dot = present(bySlot(document.body, 'map-point-hit'), 'point hit target')

		const zone = present(bySlot(document.body, 'map-geofence-hit'), 'geofence hit target')

		const { x: cx, y: cy } = centreOf(dot)

		// The dot keeps the pixels it draws on, out to its own rim. The target sits
		// on the drawn radius with nothing to spare, so this is what says the dot has
		// no dead ring inside the mark a reader can see.
		for (const offset of [0, 4]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(dot)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(dot)
		}

		// And gives back the rest of the zone's middle. Both of these answered the
		// depot at the old 12px radius, so the catchment's own centre could not be
		// pointed at with a mouse.
		for (const offset of [8, 12]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(zone)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(zone)
		}
	})

	it('sizes a summary’s target to the summary rather than to the reach', () => {
		const { container } = renderUI(
			// Two stops ~4px apart, so they merge into one summary at the first grade,
			// on a zone that holds the target to what the summary draws.
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapGeofence label="Catchment" at={[8, 5]} radius={300_000} />

				<MapPoints label="Stops" points={[{ at: [8, 5] }, { at: [8.3, 5] }]} />
			</MapPlat>,
		)

		const summary = present(bySlot(container, 'map-points-hit'), 'summary hit target')

		// The grade it draws at, not the 22px coarse reach the attribute carries: a
		// summary took that whole finger target while one figure served every dot.
		expect(radiusOf(summary)).toBeCloseTo(clusterRadius(2), 0)
	})

	it('holds that target at one size through every scale the view takes', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom>
				<MapGeofence label="Catchment" at={[15, 5]} radius={300_000} />

				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		const dot = present(bySlot(container, 'map-point-hit'), 'point hit target')

		const radii = [radiusOf(dot)]

		zoomToCeiling(plot, () => radii.push(radiusOf(dot)))

		// A CSS length on an SVG shape is a user unit, so an uncorrected target rode
		// the transform: a 5.5px radius at rest and 43.8px at the ceiling, eight times
		// the dot a reader sees. The spread is the transform attribute's rounding.
		expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.1)

		// Measured rather than assumed constant: a target pinned at the wrong size
		// would also spread by nothing.
		expect(radii[0]).toBeCloseTo(POINT_HIT_RADIUS_FINE, 1)
	})

	it('keeps both stops reachable the moment a zoom separates a summary', () => {
		const { container } = renderUI(
			// Two stops 0.14° apart: merged at rest in a 400px frame, and separated by
			// the 8× ceiling. Marks merge by a device-pixel distance, so a pair that has
			// just parted always sits about 14px apart — however far in the view sits.
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom>
				<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [15.14, 5] }]} />
			</MapPlat>,
		)

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		zoomToCeiling(plot)

		const targets = allBySlot(container, 'map-points-hit')

		// The pair has to have parted, or the case below asserts nothing.
		expect(targets).toHaveLength(2)

		// A scaling target was 43.8px per dot across a 14.9px gap, so each one covered
		// the other's centre and the topmost took both readouts — the zoom handed the
		// reader two stops and one of them answered to nothing. The pair earns the
		// narrow target on each other rather than on a zone: a neighbour that close
		// is the whole reason a dot gives its reach back.
		for (const target of targets) {
			const { x, y } = centreOf(target)

			expect(document.elementFromPoint(x, y)).toBe(target)
		}
	})
})
