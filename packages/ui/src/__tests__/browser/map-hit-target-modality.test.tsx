import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import { POINT_HIT_RADIUS, POINT_RADIUS } from '../../modules/map/engine/map-constants'
import { allBySlot, bySlot, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { zoomToCeiling } from './helpers/map-zoom'

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
		// It is the share the catchment spares: past what the dot draws, and short of
		// the reach the attribute carries.
		const used = Number.parseFloat(getComputedStyle(hit).r)

		expect(used).toBeGreaterThan(POINT_RADIUS)

		expect(used).toBeLessThan(POINT_HIT_RADIUS)
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

		// Probed off the budget the depot actually took rather than off fixed
		// offsets, so the case reads the boundary between the two marks wherever the
		// zone's own measure puts it — which is the thing under test.
		const used = Number.parseFloat(getComputedStyle(dot).r)

		expect(used).toBeLessThan(POINT_HIT_RADIUS)

		// The dot keeps every pixel of what it was budgeted, out to its own rim, so
		// this is what says it has no dead ring inside the mark a reader can see.
		for (const offset of [0, used - 4]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(dot)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(dot)
		}

		// And gives back the rest of the zone's middle. Both of these answered the
		// depot while one dot took the whole reach, so the catchment's own centre
		// could not be pointed at with a mouse.
		for (const offset of [used + 4, used + 10]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(zone)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(zone)
		}
	})

	it('sizes a summary’s target to the summary rather than to what the zone spares', () => {
		const { container } = renderUI(
			// Two stops ~4px apart, so they merge into one summary at the first grade,
			// on a 60 km yard narrower on the frame than the summary drawn over it —
			// so the floor is what decides the size and a browser can read it.
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapGeofence label="Yard" at={[8, 5]} radius={60_000} />

				<MapPoints label="Stops" points={[{ at: [8, 5] }, { at: [8.3, 5] }]} />
			</MapPlat>,
		)

		const summary = present(bySlot(container, 'map-points-hit'), 'summary hit target')

		// The grade it draws at, not the 22px coarse reach the attribute carries and
		// not the sliver the yard could spare: a summary took that whole finger target
		// while one figure served every dot, and a target inside the summary would
		// leave the mark a reader can see a dead rim.
		expect(radiusOf(summary)).toBeCloseTo(clusterRadius(2), 0)
	})

	it('holds that target inside the coarse reach through every scale the view takes', () => {
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

		// The target grows with the zone under it — a catchment eight times as wide
		// on screen has eight times the room to spare — and stops at the reach a
		// finger takes, which is the ceiling on every dot at every scale.
		expect(Math.max(...radii)).toBeLessThanOrEqual(POINT_HIT_RADIUS + 0.1)

		// A CSS length on an SVG shape is a user unit, so an uncorrected target rides
		// the transform whole: the same dot measured 43.8px at the ceiling, eight
		// times the mark a reader sees. Measured at rest rather than assumed, so a
		// target pinned at the wrong size cannot pass by never moving.
		expect(radii[0]).toBeGreaterThan(POINT_RADIUS)

		expect(radii[0]).toBeLessThan(POINT_HIT_RADIUS)
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
