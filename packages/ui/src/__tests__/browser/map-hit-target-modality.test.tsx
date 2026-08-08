import { describe, expect, it } from 'vitest'
import { MapGeofence, MapPlat, MapPoint } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_HIT_RADIUS_FINE } from '../../modules/map/engine/map-constants'
import { bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

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

		const box = dot.getBoundingClientRect()

		const cx = box.left + box.width / 2

		const cy = box.top + box.height / 2

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
})
