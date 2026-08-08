import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_HIT_RADIUS_FINE } from '../../modules/map/engine/map-constants'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** The centre of an element's box, in client coordinates. */
function centreOf(element: Element) {
	const box = element.getBoundingClientRect()

	return { x: box.left + box.width / 2, y: box.top + box.height / 2, radius: box.width / 2 }
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
 * So the second case probes what the pointer actually lands on rather than what
 * the target computes to, the way `grid-target-size` does: a real layout engine
 * is the only thing that can resolve one target through another.
 *
 * The relations between the two radii are pinned in jsdom
 * (`modules/map-hit-target`); these are the two things only a browser can say.
 */
describe('dot hit target by pointer modality', () => {
	it('resolves to the fine target while the coarse reach stays on the attribute', () => {
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = bySlot(document.body, 'map-point-hit') as Element

		// The attribute is the fallback a browser without CSS `r` keeps.
		expect(hit.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		// The used value is what hit-testing reads — and what the class sets.
		// `SVGCircleElement.r.baseVal` reflects the attribute, so it cannot say this.
		expect(getComputedStyle(hit).r).toBe(`${POINT_HIT_RADIUS_FINE}px`)
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

		const dot = bySlot(document.body, 'map-point-hit') as Element

		const zone = bySlot(document.body, 'map-geofence-hit') as Element

		const { x: cx, y: cy } = centreOf(dot)

		// The dot keeps the pixels it draws on, out to its own rim. The target sits
		// on the drawn radius with nothing to spare, so this is what says the dot has
		// no dead ring inside the mark a reader can see.
		for (const offset of [0, 4]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(dot)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(dot)
		}

		// And gives back the rest of the zone's middle. At the old 24px target every
		// one of these probes answered the depot, so the catchment's own centre could
		// not be pointed at with a mouse.
		for (const offset of [8, 12, 16, 20]) {
			expect(document.elementFromPoint(cx + offset, cy)).toBe(zone)

			expect(document.elementFromPoint(cx, cy + offset)).toBe(zone)
		}
	})

	it('holds that target at one size through every scale the view takes', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} zoom>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const plot = bySlot(container, 'map-plot') as Element

		const dot = bySlot(container, 'map-point-hit') as Element

		const radii = [centreOf(dot).radius]

		// Six steps of 1.6 reach the 8× ceiling, so this sweeps the whole range.
		for (let press = 0; press < 6; press += 1) {
			fireEvent.keyDown(plot, { key: '+' })

			radii.push(centreOf(dot).radius)
		}

		// A CSS length on an SVG shape is a user unit, so an uncorrected target rode
		// the transform: 5.5px at rest and 43.8px at the ceiling, eight times the dot
		// a reader can see. The spread is the rounding in the transform attribute.
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

		const plot = bySlot(container, 'map-plot') as Element

		for (let press = 0; press < 6; press += 1) fireEvent.keyDown(plot, { key: '+' })

		const targets = [...allBySlot(container, 'map-points-hit')]

		// The pair has to have parted, or the case below asserts nothing.
		expect(targets).toHaveLength(2)

		// A scaling target was 43.8px per dot across a 14.9px gap, so each one covered
		// the other's centre and the topmost took both readouts — the zoom handed the
		// reader two stops and one of them answered to nothing.
		for (const target of targets) {
			const { x, y } = centreOf(target)

			expect(document.elementFromPoint(x, y)).toBe(target)
		}
	})
})
