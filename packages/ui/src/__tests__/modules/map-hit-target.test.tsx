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
	AREA_SPARE_FRACTION,
	POINT_HIT_RADIUS,
	POINT_HIT_RADIUS_FINE,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import { k } from '../../recipes/kata/map'
import { allBySlot, bySlot, fireEvent, present, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/**
 * The zone the depot cases stand on. The default is wide enough to hold the
 * frame's middle with room to spare; a narrower radius makes a zone the marks
 * over it are wider than, which is the other side of the rule.
 */
function catchment(children: ReactNode, radius = 300_000) {
	return plat(
		<>
			<MapGeofence label="Catchment" at={[15, 5]} radius={radius} />

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
		const room = budget(target, 'point hit target')

		expect(room).toBeGreaterThan(POINT_RADIUS)

		expect(room).toBeLessThan(POINT_HIT_RADIUS)
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
			// A 60 km zone, narrower on the frame than the summary drawn over it, and
			// two stops ~4px apart so they merge into one summary at the first cluster
			// grade — wider than the dot a lone stop draws.
			catchment(<MapPoints label="Stops" points={[{ at: [15, 5] }, { at: [15.3, 5] }]} />, 60_000),
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

/**
 * Two separate marks standing within a target's reach of one another used to keep the whole circle
 * each: `crowd.ts` could see only one mark's own dots, so the overlap belonged to whichever drew last
 * and the dot underneath silently lost a crescent of its target — and its tooltip with it.
 *
 * Each now clips its target to the ground nearer to itself, so the outward reach is untouched and only
 * the contested middle divides. Asserted on the clip's presence and its ring rather than on a hit test,
 * because jsdom performs no layout and cannot say what a pointer at a coordinate would reach.
 */
describe('crowded marks divide their targets', () => {
	function clipOf(target: Element | null) {
		const reference = target?.getAttribute('clip-path')

		return reference?.match(/^url\(#(.+)\)$/)?.[1] ?? null
	}

	function ring(container: HTMLElement, id: string) {
		return container.querySelector(`clipPath#${id} polygon`)?.getAttribute('points') ?? null
	}

	/** Two points near enough that each target reaches the other — the case every clip test wants. */
	function crowded() {
		return renderUI(
			plat(
				<>
					<MapPoint label="Depot" at={[15, 5]} />

					<MapPoint label="Annex" at={[15.4, 5.2]} />
				</>,
			),
		)
	}

	it('leaves a lone point unclipped', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[15, 5]} />))

		// The common case pays for nothing: no clip attribute, no clipPath element, no id.
		expect(clipOf(bySlot(container, 'map-point-hit'))).toBeNull()

		expect(container.querySelector('clipPath')).toBeNull()
	})

	it('leaves two distant points unclipped', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapPoint label="West" at={[-60, 5]} />

					<MapPoint label="East" at={[60, 5]} />
				</>,
			),
		)

		for (const target of allBySlot(container, 'map-point-hit')) {
			expect(clipOf(target)).toBeNull()
		}
	})

	it('declares the clip in <defs>, as every other clip in the module does', () => {
		const { container } = crowded()

		const clips = container.querySelectorAll('clipPath')

		expect(clips).toHaveLength(2)

		// A `<clipPath>` never renders wherever it sits, so this is convention rather than correctness —
		// `MapChrome`'s frame clip and `ChartLine`'s wipe both declare theirs this way, and one clip
		// declared differently from the others is a thing the next reader has to stop and check. The
		// queries above and below reach through descendants, so nothing else here would notice it move.
		for (const clip of clips) {
			expect(clip.parentElement?.tagName).toBe('defs')
		}
	})

	it('clips both points when two separate marks crowd each other', () => {
		const { container } = crowded()

		const targets = allBySlot(container, 'map-point-hit')

		expect(targets).toHaveLength(2)

		// BOTH, and to different rings: the cut is symmetric, so neither dot's ownership depends on the
		// order the two were declared in.
		const ids = targets.map((target) => clipOf(target))

		expect(ids.every((id) => id !== null)).toBe(true)

		expect(ids[0]).not.toBe(ids[1])

		const rings = ids.map((id) => (id === null ? null : ring(container, id)))

		expect(rings.every((points) => points !== null && points.length > 0)).toBe(true)

		expect(rings[0]).not.toBe(rings[1])
	})

	it('keeps the full radius on the clipped target rather than shrinking it', () => {
		const { container } = crowded()

		const target = bySlot(container, 'map-point-hit')

		// The whole point of clipping over shrinking: the circle is still the finger-sized one, and the
		// fine-pointer narrowing is untouched, so the uncontested three quarters keep their reach.
		expect(Number.parseFloat(present(target, 'r').getAttribute('r') ?? '')).toBeCloseTo(
			POINT_HIT_RADIUS,
			5,
		)

		expect(fine(target)).toBe(false)
	})

	it('does not let a route or a zone contest a point’s ground', () => {
		const { container } = renderUI(catchment(<MapPoint label="Depot" at={[15, 5]} />))

		// A zone's claim is a `spare` budget, not a boundary — it paints a face rather than a dot, so
		// there is no line to divide along and nothing here to clip against.
		expect(clipOf(bySlot(container, 'map-point-hit'))).toBeNull()
	})
})

/**
 * A dot over a region layer that answers the pointer narrows for a mouse, because the dot is the
 * topmost thing at its own pixels: a 44px target over such a shape puts a 44px hole in it, and a dot
 * near the middle of a small region can put that region out of reach altogether.
 *
 * Answering is not clicking alone — a matched region reads out under the pointer, and a right-click
 * can open a menu on it. Read as clicks alone, the several county maps a coverage drill tiles kept the
 * full finger target on every pin: they take no county pick, because a pick could only be read back
 * onto one of them.
 *
 * The third claimant on the same ground the zones and the neighbours claim, arriving through the same
 * budget — which is why `markTargets` needed to learn nothing for it.
 */
describe('a dot over regions that answer the pointer', () => {
	/**
	 * A frame narrow enough that the fixture's squares are small shapes. The three
	 * ten-degree squares span the frame, so one draws a third of it — roomy in
	 * absolute pixels at 400, and a shape with something to lose here.
	 */
	const TIGHT = 120

	/**
	 * What one of those squares can spare a dot standing on it. A square of side
	 * `s` holds `2 · area / perimeter` = `s / 2` inscribed, so a third of the frame
	 * across is a sixth of it inscribed, and the dot takes half of that.
	 */
	const SQUARE_SPARE = (TIGHT / 6) * AREA_SPARE_FRACTION

	function clickable(children: ReactNode, width = TIGHT) {
		return (
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={width}
				onRegionClick={() => {}}
			>
				{children}
			</MapPlat>
		)
	}

	/** Regions that read out and nothing more: no pick to make, and a readout to lose. */
	function reading(children: ReactNode) {
		return (
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				width={TIGHT}
			>
				{children}
			</MapPlat>
		)
	}

	it('narrows the mouse target so the region behind stays pickable', () => {
		const { container } = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />))

		const target = bySlot(container, 'map-point-hit')

		expect(fine(target)).toBe(true)

		// Half of what the square itself holds, so the region keeps at least as much as it gives —
		// the fixture's own geometry rather than a constant.
		expect(budget(target, 'style')).toBeCloseTo(SQUARE_SPARE, 0)
	})

	it('scales the claim with the region rather than fixing it', () => {
		const tight = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />))

		const wide = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />, TIGHT * 2))

		// The whole of what a fixed figure could not do. Region areas on a real atlas run three
		// orders of magnitude apart, so the claim has to be a share of the shape: double the frame
		// and the same square holds twice the room, so the dot may take twice as much of it.
		expect(budget(bySlot(wide.container, 'map-point-hit'), 'style')).toBeCloseTo(
			budget(bySlot(tight.container, 'map-point-hit'), 'style') * 2,
			0,
		)
	})

	it('leaves a region with room to spare the whole target', () => {
		const { container } = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />, 400))

		// A dot narrows to give ground back, so a shape with ground to spare is owed nothing: at this
		// width the square runs 130px across and a 44px target is a hole in it a reader cannot miss.
		// The fixed figure this replaced charged every dot on every map alike, this one included.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('floors at the drawn dot where the region has nothing to spare', () => {
		const { container } = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />, 40))

		// New Jersey's case, and every smaller state's: the mark is wider than the ground under it, so
		// the share works out under what the dot paints and `markTargets` floors it there. The region
		// keeps everything outside the pixels the dot literally draws, which is all it can be given.
		expect(budget(bySlot(container, 'map-point-hit'), 'style')).toBeCloseTo(POINT_RADIUS, 5)
	})

	it('narrows over regions that only read out, with no pick to make', () => {
		const { container } = renderUI(reading(<MapPoint label="Depot" at={[15, 5]} />))

		// The bug the clicks-only reading left: a readout is a thing under the dot too, and losing it
		// to a 44px hole is the same loss as losing a pick. This is the tiled county maps' own case.
		// The size is pinned by the clickable case above; what this one proves is that a layer with
		// no pick to make earns the claim at all.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(true)
	})

	it('narrows over regions that answer only a right-click', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={TIGHT}
				onRegionContextMenu={() => {}}
			>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		// A menu is an output like the other two, and its handler rides the group rather than the
		// paths — so it answers on a map whose regions read nothing.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(true)
	})

	it('keeps the whole target where the regions answer nothing at all', () => {
		// At `TIGHT`, where a layer that DID answer would narrow this dot — at the wider frame the
		// squares can spare a whole finger target, so the case would pass either way and prove
		// nothing about the bit it names.
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={TIGHT}>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		// The claim is the answering, not the region layer: an atlas whose rows matched none of its
		// shapes binds no pointer handlers on them and leads nowhere, so it takes nothing from the dots
		// over it — the backdrop map `regionsRead` exists to keep cheap.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('keeps the whole target where the caller switches the layer off', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				width={TIGHT}
				regionPointer={false}
				onRegionClick={() => {}}
				onRegionContextMenu={() => {}}
			>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		// `regionPointer={false}` withdraws all three answers at once, so every earner above is moot
		// and the dot pays nothing. A drilled map is the case: the one state on screen is the ground
		// its dots stand on, and the dots are the only thing left to reach for.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('narrows every dot-shaped mark, not just the singular one', () => {
		const { container } = renderUI(
			clickable(
				<MapPoints label="Stops" points={[{ at: [5, 5] }, { at: [25, 4] }]} cluster={false} />,
			),
		)

		// One rule, read by every mark through `markTargets` — the reason the third claimant needed no
		// per-mark wiring.
		for (const target of allBySlot(container, 'map-points-hit')) {
			expect(fine(target)).toBe(true)
		}
	})

	it('asks nothing of a dot standing off the geography', () => {
		const { container } = renderUI(clickable(<MapPoint label="Buoy" at={[-60, 20]} />))

		// The claim is the region under the dot, so a dot with no region under it owes nothing. The
		// map-wide reading this replaced could not tell the two apart and charged every dot alike —
		// its own stated cost, and the ocean is where a map of places puts a surprising number.
		expect(fine(bySlot(container, 'map-point-hit'))).toBe(false)
	})

	it('keeps the coarse target for a finger even over clickable regions', () => {
		const { container } = renderUI(clickable(<MapPoint label="Depot" at={[15, 5]} />))

		// The `r` attribute is still the finger-sized one; only the `pointer-fine` override narrows it.
		// A coarse pointer cannot aim at 11px (WCAG 2.5.5), and a region is a large shape it can reach
		// elsewhere.
		expect(
			Number.parseFloat(present(bySlot(container, 'map-point-hit'), 'r').getAttribute('r') ?? ''),
		).toBeCloseTo(POINT_HIT_RADIUS, 5)
	})
})

/**
 * A choropleth whose atlas has drawn but whose numbers have not arrived takes the no-data fill on
 * every region — which looks exactly like a map where nothing covers anywhere. `pending` makes the
 * difference visible while the request is in flight.
 */
describe('a map whose values are still loading', () => {
	function regionLayer(container: HTMLElement) {
		return container.querySelector('[data-slot="map-regions"]')
	}

	it('pulses the region layer while its values are pending, and dims it instead under reduced motion', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} pending>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const paint = regionLayer(container)?.getAttribute('class')

		// On the GROUP, so it inherits to every path — thousands of regions carry no class of their own,
		// the same reason the pointer cursor rides the group. `motion-safe` rather than a bare animation,
		// with a standing dim in its place rather than nothing: a reader who asked for less motion is
		// owed the loading state, not just spared the pulse.
		expect(paint).toContain('motion-safe:animate-pulse')

		expect(paint).toContain('motion-reduce:opacity-50')
	})

	it('does not pulse once the values are in', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const paint = regionLayer(container)?.getAttribute('class') ?? ''

		// Neither arm: the dim is the pulse's stand-in, not a second state.
		expect(paint).not.toContain('animate-pulse')

		expect(paint).not.toContain('opacity-50')
	})
})
