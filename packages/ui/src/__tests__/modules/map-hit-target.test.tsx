import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MapGeofence, MapMarker, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { clusterRadius } from '../../modules/map/engine/map-cluster/radius'
import {
	POINT_HIT_RADIUS,
	POINT_HIT_RADIUS_FINE,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import { k } from '../../recipes/kata/map'
import { allBySlot, bySlot, fireEvent, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/** The catchment the depot cases stand in, wide enough to hold the frame's middle. */
function catchment(children: ReactNode) {
	return plat(
		<>
			<MapGeofence label="Catchment" at={[15, 5]} radius={300_000} />

			{children}
		</>,
	)
}

/** Whether a target has given the ground it does not paint back to what lies under it. */
function fine(target: Element | null) {
	return (target?.getAttribute('class') ?? '').includes(k.hitFine)
}

/**
 * The pointer target on the dot-shaped marks. The size is a rule about the input
 * device and about what stands under the mark, not about the mark itself: the `r`
 * attribute carries the coarse reach on every dot, and the class takes a dot down
 * to what it draws — through a custom property the factory sets to the dot's own
 * drawn radius, since a target narrower than its own dot would leave the dot a
 * dead rim — but only where something under it needs those pixels.
 *
 * The class only resolves in a real browser, so `browser/map-hit-target-modality`
 * gates what it computes to; these cases gate what is rendered, how the two
 * numbers relate, and which dots earn the narrower one.
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

	it('carries the coarse reach on the attribute of every dot-shaped target', () => {
		const { container } = renderUI(
			catchment(
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
			// One rule for every dot: the attribute is the reach a finger takes, and
			// the fallback a browser resolving no CSS `r` keeps.
			expect(target.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))
		}
	})

	it('gives the ground back where a mark stands on a drawn zone', () => {
		const { container } = renderUI(catchment(<MapPoint label="Depot" at={[15, 5]} />))

		const target = bySlot(container, 'map-point-hit')

		expect(fine(target)).toBe(true)

		// The dot's own drawn radius, so the target covers the mark and no more.
		expect(present(target, 'point hit target').style.getPropertyValue(k.hitRadius)).toBe(
			`${POINT_RADIUS}px`,
		)
	})

	it('keeps the whole target where a lone dot stands on open geography', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[15, 5]} />))

		const target = bySlot(container, 'map-point-hit')

		// Nothing under the dot to yield to, so it holds the reach a finger needs on
		// both pointers — and carries no property for a class that isn't there.
		expect(fine(target)).toBe(false)

		expect(present(target, 'point hit target').style.getPropertyValue(k.hitRadius)).toBe('')
	})

	it('leaves a dot outside a drawn zone on the whole target', () => {
		// The zone sits at 15°; the depot stands well clear of its 300 km radius.
		const { container } = renderUI(catchment(<MapPoint label="Depot" at={[28, 8]} />))

		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('hands the pixels back when the legend puts the zone away', () => {
		const { container } = renderUI(catchment(<MapPoint label="Depot" at={[15, 5]} />))

		expect(fine(bySlot(container, 'map-point-hit'))).toBe(true)

		const zone = allBySlot(container, 'map-legend-item').find((item) =>
			item.textContent?.includes('Catchment'),
		)

		fireEvent.click(present(zone, 'catchment legend entry'))

		// The point is all that is still drawn on that ground, so it takes the
		// typical target back.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('holds a dot precise while a neighbour stands inside its coarse reach', () => {
		const { container } = renderUI(
			// Two stops ~15px apart in a 400px frame: clear of the merge distance, so
			// each draws its own dot, and well inside a 44px target.
			plat(<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [16.05, 5] }]} />),
		)

		const targets = allBySlot(container, 'map-points-hit')

		expect(targets).toHaveLength(2)

		// Neither dot may claim the other's face: the target over one would take the
		// readout of the mark beside it, and that mark would answer nothing.
		for (const target of targets) expect(fine(target)).toBe(true)
	})

	it('leaves the dots of a spread-out set on the whole target', () => {
		const { container } = renderUI(
			plat(<MapPoints label="Stops" points={[{ at: [2, 2] }, { at: [28, 8] }]} />),
		)

		const targets = allBySlot(container, 'map-points-hit')

		expect(targets).toHaveLength(2)

		for (const target of targets) expect(fine(target)).toBe(false)
	})

	it('carries a summary’s own radius on the property the target reads', () => {
		const { container } = renderUI(
			// Two stops ~4px apart in a 400px frame, so they merge into one summary —
			// drawn at the first cluster grade, wider than the dot a lone stop draws —
			// standing on the zone that holds the target to what it draws.
			catchment(<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [15.3, 5] }]} />),
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
		const { container } = renderUI(
			catchment(<MapPoint label="Depot" at={[15, 5]} onClick={() => {}} />),
		)

		const className = bySlot(container, 'map-point-hit')?.getAttribute('class') ?? ''

		// A clickable mark carries the pointer affordance; the target rides beside it.
		expect(className).toContain(k.hitFine)

		expect(className).toContain(k.clickable)
	})

	it('holds a marker’s pins precise where a short leg draws them within reach', () => {
		const { container } = renderUI(
			// About 15px apart in a 400px frame — each pin's coarse target would cover
			// the other's face.
			plat(<MapMarker label="Shuttle" start={[15, 5]} end={[16.05, 5]} />),
		)

		expect(fine(bySlot(container, 'map-marker-start-hit'))).toBe(true)

		expect(fine(bySlot(container, 'map-marker-end-hit'))).toBe(true)
	})

	it('leaves a long haul’s pins on the whole target', () => {
		const { container } = renderUI(plat(<MapMarker label="Haul" start={[2, 2]} end={[28, 8]} />))

		expect(fine(bySlot(container, 'map-marker-start-hit'))).toBe(false)

		expect(fine(bySlot(container, 'map-marker-end-hit'))).toBe(false)
	})
})
