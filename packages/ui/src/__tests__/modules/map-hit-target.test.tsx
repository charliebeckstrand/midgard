import { describe, expect, it } from 'vitest'
import { MapMarker, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_HIT_RADIUS_FINE } from '../../modules/map/engine/map-constants'
import { k } from '../../recipes/kata/map'
import { allBySlot, bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The pointer-target floor on the dot-shaped marks. The size is a rule about the
 * input device, not about the mark, so every dot target reads one rule: the `r`
 * attribute carries the coarse reach and the class takes it to the fine floor.
 */
describe('dot hit targets', () => {
	it('spells the same fine radius in the class as the constant names', () => {
		// Tailwind scans source for whole class strings, so the radius cannot be
		// interpolated from the constant. This is what keeps the two in step.
		expect(k.hitFine).toBe(`pointer-fine:[r:${POINT_HIT_RADIUS_FINE}px]`)
	})

	it('holds the WCAG target floors: 44px for a finger, 24px for a mouse', () => {
		// 2.5.5 (enhanced) for a coarse pointer, 2.5.8 (minimum) for a fine one —
		// the same pair the `TouchTarget` primitive floors an interactive host at.
		expect(POINT_HIT_RADIUS * 2).toBe(44)

		expect(POINT_HIT_RADIUS_FINE * 2).toBe(24)
	})

	it('carries the coarse radius on the attribute, so a browser resolving no CSS `r` keeps the reach', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		const hit = bySlot(container, 'map-point-hit')

		expect(hit?.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		expect(hit?.getAttribute('class')).toContain(k.hitFine)
	})

	it('applies the same rule to every dot-shaped target', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />

				<MapPoints label="Stops" points={[{ at: [12, 6] }, { at: [25, 4] }]} cluster={false} />

				<MapMarker label="Haul" start={[2, 2]} end={[28, 8]} />
			</MapPlat>,
		)

		const targets = [
			...allBySlot(container, 'map-point-hit'),
			...allBySlot(container, 'map-points-hit'),
			...allBySlot(container, 'map-marker-start-hit'),
			...allBySlot(container, 'map-marker-end-hit'),
		]

		// A point, both marker pins, and each dot of a set — every one of them.
		expect(targets.length).toBeGreaterThanOrEqual(5)

		for (const target of targets) {
			expect(target.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

			expect(target.getAttribute('class')).toContain(k.hitFine)
		}
	})

	it('keeps the hit target a transparent fill, so it answers where the dot does not paint', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[8, 5]} />
			</MapPlat>,
		)

		expect(bySlot(container, 'map-point-hit')?.getAttribute('fill')).toBe('transparent')
	})
})
