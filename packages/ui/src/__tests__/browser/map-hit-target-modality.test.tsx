import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoint } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_HIT_RADIUS_FINE } from '../../modules/map/engine/map-constants'
import { bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The fine-pointer hit floor, in a real browser (Vitest browser mode drives
 * Chromium with a mouse, so `pointer: fine` matches here and the jsdom suite
 * can resolve neither the media query nor a CSS `r`).
 *
 * Two things could break this silently and neither shows up in a unit test:
 * Tailwind failing to emit the arbitrary `[r:…]` property, and a browser
 * dropping CSS geometry properties on SVG shapes. Either would put every dot
 * back to the finger-sized target, and a `MapGeofence` drawn tight around a
 * `MapPoint` would stop answering the mouse.
 */
describe('dot hit target by pointer modality', () => {
	it('resolves to the fine floor while the coarse reach stays on the attribute', () => {
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = bySlot(document.body, 'map-point-hit') as Element

		// The attribute is the fallback a browser without CSS `r` keeps.
		expect(hit.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		// The used value is what hit-testing reads — and what the class sets.
		expect(getComputedStyle(hit).r).toBe(`${POINT_HIT_RADIUS_FINE}px`)
	})

	it('leaves the dot itself smaller than its own target', () => {
		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = bySlot(document.body, 'map-point-hit') as Element

		const radius = Number.parseFloat(getComputedStyle(hit).r)

		// Still a comfortable target: the drawn dot is 5.5, so the mouse gets
		// better than twice the mark without claiming a small zone around it.
		expect(radius).toBeGreaterThan(5.5)

		expect(radius).toBeLessThan(POINT_HIT_RADIUS)
	})
})
