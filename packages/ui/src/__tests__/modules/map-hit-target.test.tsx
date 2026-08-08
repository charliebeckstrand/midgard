import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MapMarker, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import {
	POINT_HIT_RADIUS,
	POINT_HIT_RADIUS_FINE,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import { k } from '../../recipes/kata/map'
import { allBySlot, bySlot, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/**
 * The pointer target on the dot-shaped marks. The size is a rule about the input
 * device, not about the mark, so every dot target reads one rule: the `r`
 * attribute carries the coarse reach, and the class reads the fine one off a
 * custom property the factory sets to the dot's own drawn radius — a target
 * narrower than its own dot would leave the dot a dead rim.
 *
 * The class only resolves in a real browser, so `browser/map-hit-target-modality`
 * gates what it computes to; these cases gate what is rendered and how the two
 * numbers relate.
 */
describe('dot hit targets', () => {
	it('spells the same fine radius in the class as the constant names', () => {
		// Tailwind scans source for whole class strings, so the radius cannot be
		// interpolated from the constant. This is what keeps the two in step. The
		// fallback is what a shape with no property of its own resolves to.
		expect(k.hitFine).toBe(`pointer-fine:[r:var(${k.hitRadius},${POINT_HIT_RADIUS_FINE}px)]`)
	})

	it('holds the coarse reach, and pins the fine target to the drawn dot', () => {
		// WCAG 2.5.5 (enhanced) for a coarse pointer — what `TouchTarget` floors a
		// finger at, and the reach a finger genuinely needs.
		expect(POINT_HIT_RADIUS * 2).toBe(44)

		// A mouse takes precision instead, under 2.5.8's 24px minimum on purpose:
		// a `MapGeofence` drawn around a `MapPoint` is what the pixels go back to.
		expect(POINT_HIT_RADIUS_FINE * 2).toBe(11)

		// The drawn dot exactly — no reach past what the mark paints, and no dead
		// rim inside it. This is the class's fallback; `dotHitProps` sets each
		// shape's own radius, so a summary is covered by the grade it draws at.
		expect(POINT_HIT_RADIUS_FINE).toBe(POINT_RADIUS)
	})

	it('applies one rule to every dot-shaped target', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapPoint label="Depot" at={[8, 5]} />

					<MapPoints label="Stops" points={[{ at: [12, 6] }, { at: [25, 4] }]} cluster={false} />

					<MapMarker label="Haul" start={[2, 2]} end={[28, 8]} />
				</>,
			),
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
			// The attribute is the fallback a browser resolving no CSS `r` keeps.
			expect(target.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

			expect(target.getAttribute('class')).toContain(k.hitFine)
		}
	})

	it('carries a summary’s own radius on the property the target reads', () => {
		const { container } = renderUI(
			// Two stops ~4px apart in a 400px frame, so they merge into one summary —
			// drawn at the first cluster grade, wider than the dot a lone stop draws.
			plat(<MapPoints label="Stops" points={[{ at: [8, 5] }, { at: [8.3, 5] }]} />),
		)

		expect(bySlot(container, 'map-points-cluster')).not.toBeNull()

		const targets = allBySlot(container, 'map-points-hit')

		expect(targets).toHaveLength(1)

		// A 5.5px target inside a 9px dot would leave the dot a dead rim, so the
		// property carries the grade the summary draws at rather than one figure for
		// every dot. `clusterRadius` is what the mark itself passes.
		expect(present(targets[0], 'summary hit target').style.getPropertyValue(k.hitRadius)).toBe(
			`${clusterRadius(2)}px`,
		)
	})

	it('keeps the hit target a transparent fill, so it answers where the dot does not paint', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[8, 5]} />))

		expect(bySlot(container, 'map-point-hit')?.getAttribute('fill')).toBe('transparent')
	})

	it('composes the mark’s own hit class with the target class rather than replacing it', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[8, 5]} onClick={() => {}} />))

		const className = bySlot(container, 'map-point-hit')?.getAttribute('class') ?? ''

		// A clickable mark carries the pointer affordance; the target rides beside it.
		expect(className).toContain(k.hitFine)

		expect(className).toContain(k.clickable)
	})
})
