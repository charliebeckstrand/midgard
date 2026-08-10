import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
	type LngLat,
	MapGeofence,
	MapMarker,
	MapPlat,
	MapPoint,
	MapPoints,
} from '../../modules/map'
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

/** What a target budgets a fine pointer, in device pixels, off the property it rides. */
function budget(target: Element | null, name: string) {
	return Number.parseFloat(present(target, name).style.getPropertyValue(k.hitRadius))
}

/**
 * The pointer target on the dot-shaped marks. The size is a rule about the input
 * device and about what stands under the mark, not about the mark itself: the `r`
 * attribute carries the coarse reach on every dot, and the class takes a mouse
 * down to what the ground under the dot can spare — through a custom property the
 * factory sets from that budget — but only where something under it needs those
 * pixels.
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

		// The drawn dot exactly — the floor a budget can never take a target under,
		// since a target narrower than its own dot would leave the dot a dead rim.
		// This is the class's fallback; `dotHitProps` sets each shape's own figure.
		//
		// Two literals held equal here rather than one derived from the other: the
		// fine radius ships inside `hitFine`'s class string and nothing reads the
		// constant at runtime, so binding it to `POINT_RADIUS` would leave one
		// export under two names. This assertion is the tie.
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

		// A share of the room the zone holds, not the dot's own radius: the depot
		// keeps a target a mouse can aim at, and the catchment keeps a band around
		// it wide enough to answer for itself.
		expect(budget(target, 'point hit target')).toBeGreaterThan(POINT_RADIUS)

		expect(budget(target, 'point hit target')).toBeLessThan(POINT_HIT_RADIUS)
	})

	it('budgets every corner of a zone drawn through its own marks alike', () => {
		// The reading this replaced asked whether a dot stood inside the zone, and a
		// zone strung between the marks it holds puts every one of them on its
		// boundary — where inside-or-out has no answer and a ray cast is decided by
		// the winding. The three corners on the hull read as outside and the reflex
		// one read as inside, so one dot of four pointed differently. A share of the
		// zone's room has an answer everywhere, and it is one answer per zone.
		const CORNERS: LngLat[] = [
			[4, 2],
			[26, 2],
			[26, 8],
			[15, 5],
		]

		const { container } = renderUI(
			plat(
				<>
					<MapGeofence label="Region" boundary={CORNERS} />

					<MapPoints label="Metros" points={CORNERS.map((at) => ({ at }))} cluster={false} />
				</>,
			),
		)

		const targets = allBySlot(container, 'map-points-hit')

		expect(targets).toHaveLength(4)

		// Every corner stands the same distance from the zone's own measure, because
		// the measure is the zone's and not the corner's.
		const budgets = new Set(targets.map((target) => budget(target, 'metro hit target')))

		expect(budgets.size).toBe(1)

		for (const target of targets) expect(fine(target)).toBe(true)
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
			// Two stops 16px apart in a 400px frame, which is the middle of the window
			// this case needs: past the 14px merge distance, so each draws its own dot,
			// and inside the 22px coarse reach, so each stands in the other's target.
			// Spaced off the merge distance rather than onto it — the pair sat at
			// 14.000000000000012px, which any change to the fit's last bit merges.
			plat(<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [16.2, 5] }]} />),
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

	it('floors a summary’s target at the grade it draws, however little the zone spares', () => {
		const { container } = renderUI(
			plat(
				<>
					{/* A 60 km yard — narrower on the frame than the summary drawn on it. */}
					<MapGeofence label="Yard" at={[15, 5]} radius={60_000} />

					{/* Two stops ~4px apart, so they merge into one summary at the first
					    cluster grade, wider than the dot a lone stop draws. */}
					<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [15.3, 5] }]} />
				</>,
			),
		)

		expect(bySlot(container, 'map-points-cluster')).not.toBeNull()

		const targets = allBySlot(container, 'map-points-hit')

		expect(targets).toHaveLength(1)

		// The yard's share is narrower than the mark, and a target inside its own dot
		// would leave the dot a dead rim — so the zone is what gives way, since a dot
		// no one can point at reports nothing at all. The grade the summary draws at
		// rather than one figure for every dot: `clusterRadius` is what the mark passes.
		expect(budget(targets[0] ?? null, 'summary hit target')).toBe(clusterRadius(2))
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
