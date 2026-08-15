import { geoDistance } from 'd3-geo'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LngLat } from '../../modules/map'
import { MapGeofence, MapPlat, MapPoint } from '../../modules/map'
import {
	AREA_SPARE_FRACTION,
	EARTH_RADIUS_METERS,
	GEOFENCE_CIRCLE_STEPS,
	GEOFENCE_STROKE_WIDTH,
	POINT_HIT_RADIUS,
	ROUTE_HIT_WIDTH,
} from '../../modules/map/engine/map-constants'
import { circleRing, zoneBudget, zoneSpare } from '../../modules/map/engine/map-geofence'
import { projectArea } from '../../modules/map/engine/map-geometry/mark'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** A ring over the fixture geography, wide enough to hold a mark inside it. */
const ZONE: LngLat[] = [
	[2, 2],
	[2, 8],
	[14, 8],
	[14, 2],
]

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/**
 * The great-circle distance between two positions, in metres — measured the way
 * the module measures a cluster's own spread (`clusterSpan`), so the assertions
 * below read `circleRing` against the sphere the map already works on.
 */
function groundDistance(a: LngLat, b: LngLat): number {
	return geoDistance(a, b) * EARTH_RADIUS_METERS
}

describe('circleRing', () => {
	it('closes a ring of the requested segment count', () => {
		const ring = circleRing([0, 0], 100_000)

		// One position per segment, plus the closing repeat.
		expect(ring).toHaveLength(GEOFENCE_CIRCLE_STEPS + 1)

		// Closed to the precision the tracing leaves, which is nearer than any
		// distance the map draws — `ringAnchor` finds the repeat on those terms.
		expect(ring.at(-1)?.[0]).toBeCloseTo(ring[0]?.[0] as number, 12)

		expect(ring.at(-1)?.[1]).toBeCloseTo(ring[0]?.[1] as number, 12)
	})

	it('holds every point at the radius across the ground', () => {
		const at: LngLat = [-96.8, 32.8]

		const radius = 50_000

		for (const point of circleRing(at, radius)) {
			expect(groundDistance(at, point)).toBeCloseTo(radius, -1)
		}
	})

	it('holds its ground radius far from the equator, where a planar ring would not', () => {
		// The failure this helper exists to prevent: a ring stepped in degrees
		// reads as an ellipse at latitude, narrowing east-west as the meridians
		// converge. Every point must still sit one ground distance out.
		const at: LngLat = [18.06, 69.65]

		const radius = 80_000

		const spread = circleRing(at, radius).map((point) => groundDistance(at, point))

		expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(1)
	})

	it('describes no circle for a radius at or below zero', () => {
		expect(circleRing([0, 0], 0)).toEqual([])

		expect(circleRing([0, 0], -1000)).toEqual([])

		expect(circleRing([0, 0], Number.NaN)).toEqual([])
	})

	it('describes no circle for a radius wrapping the sphere, which has no boundary', () => {
		expect(circleRing([0, 0], EARTH_RADIUS_METERS * Math.PI)).toEqual([])
	})
})

describe('MapGeofence', () => {
	it('draws a closed wash under a boundary, with an invisible hit stroke on the edge', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		const edge = bySlot(container, 'map-geofence')

		expect(edge?.getAttribute('d')).toMatch(/^M.*Z$/)

		expect(edge?.getAttribute('class')).toContain('stroke-blue-600')

		// The outline's width is stated in device pixels and converted by the mark,
		// so the ring draws whole under a zoom rather than losing the arc a dashed
		// reveal in stroke space would drop.
		expect(edge?.getAttribute('vector-effect')).toBeNull()

		const wash = bySlot(container, 'map-geofence-wash')

		expect(wash?.getAttribute('class')).toContain('fill-blue-600')

		expect(wash?.getAttribute('d')).toBe(edge?.getAttribute('d'))

		const hit = bySlot(container, 'map-geofence-hit')

		expect(hit?.getAttribute('stroke-width')).toBe(String(ROUTE_HIT_WIDTH))

		expect(hit?.getAttribute('d')).toBe(edge?.getAttribute('d'))
	})

	it('answers the pointer across its whole face, not along its boundary alone', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		const hit = bySlot(container, 'map-geofence-hit')

		// A transparent fill is not a painted one, so the hit shape has to opt in
		// explicitly — `stroke` or the painted default would leave the zone's own
		// interior dead and only its edge live.
		expect(hit?.getAttribute('fill')).toBe('transparent')

		expect(hit?.getAttribute('pointer-events')).toBe('all')
	})

	it('keeps its wash out of the pointer, so one zone never reads as two targets', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		// The hit shape above covers the same face. Left hittable too, the wash
		// would be a second target for one mark, which is the drawn/hit split every
		// other mark in the module keeps.
		expect(bySlot(container, 'map-geofence-wash')?.getAttribute('pointer-events')).toBe('none')
	})

	it('draws its hit shape last, so nothing of its own paints over the target', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		const group = bySlot(container, 'map-geofence')?.parentElement

		const order = Array.from(group?.children ?? []).map((el) => el.getAttribute('data-slot'))

		// The topmost shape at a point wins, so the hit path has to close the
		// group: the boundary reordered over it would take back its own stroke's
		// width of the target, and the wash would take the whole face.
		expect(order).toEqual(['map-geofence-wash', 'map-geofence', 'map-geofence-hit'])
	})

	it('draws a circle from a centre and a ground radius', () => {
		const { container } = renderUI(plat(<MapGeofence label="Depot" at={[8, 5]} radius={200_000} />))

		const d = bySlot(container, 'map-geofence')?.getAttribute('d') ?? ''

		expect(d).toMatch(/^M.*Z$/)

		// One command per ring position: the segments, plus the closing repeat.
		expect(d.split('L')).toHaveLength(GEOFENCE_CIRCLE_STEPS + 1)
	})

	it('draws nothing for a circle that describes no area', () => {
		const { container } = renderUI(plat(<MapGeofence label="Depot" at={[8, 5]} radius={0} />))

		expect(bySlot(container, 'map-geofence')).toBeNull()
	})

	it('registers one legend entry with an area swatch', () => {
		const { container } = renderUI(
			plat(<MapGeofence label="Zone A" boundary={ZONE} detail="42 stops" />),
		)

		const items = allBySlot(container, 'map-legend-item')

		expect(items.map((el) => el.textContent)).toEqual(['Zone A42 stops'])

		// The mark is an area, so its swatch mirrors a region's rather than a line's.
		expect(bySlot(items[0] as HTMLElement, 'swatch')?.getAttribute('data-shape')).toBe('square')
	})

	it('takes an explicit colour over its slot', () => {
		const { container } = renderUI(
			plat(<MapGeofence label="Zone A" boundary={ZONE} color="rose" />),
		)

		expect(bySlot(container, 'map-geofence')?.getAttribute('class')).toContain('stroke-rose-600')

		expect(bySlot(container, 'map-geofence-wash')?.getAttribute('class')).toContain('fill-rose-600')
	})

	it('raises the tooltip with its name and detail from the hit stroke', () => {
		const { container } = renderUI(
			plat(<MapGeofence label="Zone A" boundary={ZONE} detail="42 stops" />),
		)

		fireEvent.pointerEnter(bySlot(container, 'map-geofence-hit') as Element, {
			clientX: 100,
			clientY: 40,
		})

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Zone A')

		expect(tooltip?.textContent).toContain('42 stops')
	})

	it('reports its id from a click on the edge', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapGeofence id="zone-a" label="Zone A" boundary={ZONE} onClick={onClick} />),
		)

		fireEvent.click(bySlot(container, 'map-geofence-hit') as Element)

		expect(onClick).toHaveBeenCalledWith('zone-a', 0)
	})

	it('haloes its outline while the plat holds it selected', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={400}
				selectedOverlay={{ id: 'zone-a' }}
			>
				<MapGeofence id="zone-a" label="Zone A" boundary={ZONE} />
			</MapPlat>,
		)

		const halo = bySlot(container, 'map-geofence-selected')

		expect(halo?.getAttribute('d')).toBe(bySlot(container, 'map-geofence')?.getAttribute('d'))

		// The halo traces the outline and never fills, so the wash reads through it.
		expect(halo?.getAttribute('fill')).toBe('none')

		expect(Number(halo?.getAttribute('stroke-width'))).toBeGreaterThan(GEOFENCE_STROKE_WIDTH)
	})

	it('unmounts its marks while toggled off', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-geofence')).toBeNull()

		expect(bySlot(container, 'map-geofence-wash')).toBeNull()

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-geofence')).not.toBeNull()
	})

	it('dims against a focused sibling entry', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapGeofence label="Zone A" boundary={ZONE} />

					<MapPoint label="Depot" at={[8, 5]} />
				</>,
			),
		)

		const [zoneItem] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(zoneItem as HTMLButtonElement)

		expect(bySlot(container, 'map-geofence')?.parentElement?.getAttribute('class')).not.toContain(
			'opacity-25',
		)

		expect(bySlot(container, 'map-point')?.parentElement?.getAttribute('class')).toContain(
			'opacity-25',
		)
	})

	it('carries a row in the data table', () => {
		const { container } = renderUI(
			plat(<MapGeofence label="Zone A" boundary={ZONE} detail="42 stops" />),
		)

		expect(bySlot(container, 'map-table')?.textContent).toContain('Zone A')

		expect(bySlot(container, 'map-table')?.textContent).toContain('42 stops')
	})
})

describe('MapGeofence area', () => {
	/** The same zone as `ZONE`, stated in the nested form an `area` takes. */
	const AS_AREA: LngLat[][][] = [[ZONE]]

	/** A zone in two separate parts, each its own polygon. */
	const SPLIT: LngLat[][][] = [
		[ZONE],
		[
			[
				[20, 2],
				[20, 8],
				[28, 8],
				[28, 2],
			],
		],
	]

	/** One part with a hole cut out of the middle of it. */
	const HOLED: LngLat[][][] = [
		[
			ZONE,
			[
				[5, 4],
				[5, 6],
				[9, 6],
				[9, 4],
			],
		],
	]

	it('draws a one-ring area exactly as the same ring drawn as a boundary', () => {
		const { container: asArea } = renderUI(plat(<MapGeofence label="Zone A" area={AS_AREA} />))

		const { container: asRing } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		expect(bySlot(asArea, 'map-geofence')?.getAttribute('d')).toBe(
			bySlot(asRing, 'map-geofence')?.getAttribute('d'),
		)
	})

	it('draws every part of a split territory under one mark', () => {
		const { container } = renderUI(plat(<MapGeofence label="Coverage" area={SPLIT} />))

		// Two parts, one mark: two closed subpaths in one `d`, and one edge, one
		// wash, and one hit shape between them.
		expect(bySlot(container, 'map-geofence')?.getAttribute('d')?.match(/Z/g)).toHaveLength(2)

		expect(allBySlot(container, 'map-geofence')).toHaveLength(1)

		expect(allBySlot(container, 'map-geofence-hit')).toHaveLength(1)
	})

	it('fills and hit-tests a hole under the even-odd rule, so it reads as ground', () => {
		const { container } = renderUI(plat(<MapGeofence label="Coverage" area={HOLED} />))

		expect(bySlot(container, 'map-geofence-wash')?.getAttribute('fill-rule')).toBe('evenodd')

		// The hit shape takes the same rule as the wash: a hole answers no pointer,
		// so the region beneath it keeps its own hover.
		expect(bySlot(container, 'map-geofence-hit')?.getAttribute('fill-rule')).toBe('evenodd')
	})

	it('registers one legend entry for a territory however many parts it holds', () => {
		const { container } = renderUI(plat(<MapGeofence label="Coverage" area={SPLIT} />))

		expect(allBySlot(container, 'map-legend-item').map((item) => item.textContent)).toEqual([
			'Coverage',
		])
	})

	it('draws nothing where the territory holds no rings', () => {
		const { container } = renderUI(plat(<MapGeofence label="Coverage" area={[]} />))

		expect(bySlot(container, 'map-geofence')).toBeNull()
	})
})

/**
 * What a zone can spare the marks that stand on it. The budget is resolved once
 * for the whole zone and the per-dot answer only places the dot against it, which
 * is both what makes every mark on one zone point alike and what keeps a
 * dissolved territory from being re-measured once per dot.
 */
describe('zoneBudget and zoneSpare', () => {
	/** One frame unit per degree, so a reach reads straight off the coordinates. */
	const flat = (position: LngLat) => ({ x: position[0], y: position[1] })

	/** A square of `side` units with its lower corner at the origin. */
	const square = (side: number): LngLat[] => [
		[0, 0],
		[0, side],
		[side, side],
		[side, 0],
	]

	const budgetOf = (side: number, unitsPerPixel = 1) =>
		zoneBudget(projectArea([[square(side)]], flat), unitsPerPixel)

	it('spares a share of the zone’s own room, not the whole of it', () => {
		// A 60-unit square holds 30 units of inscribed room, so the zone keeps half
		// and hands out half — a dot at the middle can never blanket what drew it.
		expect(budgetOf(60).spare).toBe(30 * AREA_SPARE_FRACTION)
	})

	it('claims nothing of a dot standing clear of the zone', () => {
		// Past the competing band, which is one whole finger target wide.
		const zone = budgetOf(60)

		expect(zoneSpare(zone, { x: -POINT_HIT_RADIUS - 1, y: 30 })).toBe(Infinity)

		// And inside it, so the band's own edge is what the two cases part on.
		expect(zoneSpare(zone, { x: -POINT_HIT_RADIUS + 1, y: 30 })).toBe(zone.spare)
	})

	it('budgets a dot on the boundary exactly as one at the middle', () => {
		// The reading this replaced asked whether the dot was inside, which a zone
		// drawn through its own marks could not answer. One budget, one answer.
		const zone = budgetOf(60)

		expect(zoneSpare(zone, { x: 0, y: 0 })).toBe(zoneSpare(zone, { x: 30, y: 30 }))
	})

	it('reads the budget in device pixels through a zoom', () => {
		// Under the transform one device pixel spans two frame units, so a zone of
		// fixed frame width spares half as many pixels — and the band it competes
		// over grows to stay one finger target wide on screen.
		expect(budgetOf(60, 2).spare).toBe(15 * AREA_SPARE_FRACTION)

		expect(budgetOf(60, 2).margin).toBe(POINT_HIT_RADIUS * 2)
	})

	it('spares nothing from a zone the projection dropped', () => {
		const zone = zoneBudget(
			projectArea([[square(60)]], () => null),
			1,
		)

		expect(zoneSpare(zone, { x: 30, y: 30 })).toBe(Infinity)
	})
})

/**
 * A zone and the mark inside it merging into one legend entry. The pairing is the
 * whole point of `group`: a catchment and its depot are one place to a reader,
 * and the legend counted them as two.
 */
describe('MapGeofence group', () => {
	/** A catchment and the depot standing in it, named as one place. */
	function pair(group = 'Dallas') {
		return plat(
			<>
				<MapGeofence label="Dallas" group={group} boundary={ZONE} detail="Next day" />

				<MapPoint label="Dallas" group={group} at={[8, 5]} detail="Depot" />
			</>,
		)
	}

	it('merges the pair into one entry, named and detailed by the first member', () => {
		const { container } = renderUI(pair())

		const items = allBySlot(container, 'map-legend-item')

		expect(items).toHaveLength(1)

		// The zone registers first, so the entry takes its label and its readout —
		// the depot's own "Depot" stays on the depot, in the tooltip and the table.
		expect(items[0]?.textContent).toBe('DallasNext day')
	})

	it('keys the entry with one swatch per mark shape in the group', () => {
		const { container } = renderUI(pair())

		const keys = allBySlot(bySlot(container, 'map-legend-keys') as HTMLElement, 'swatch')

		// The area then the point, in registration order: the pair says what it holds
		// without a word for either.
		expect(keys.map((key) => key.getAttribute('data-shape'))).toEqual(['square', 'circle'])
	})

	it('paints every member in the colour its first member takes', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapGeofence label="Dallas" group="Dallas" boundary={ZONE} color="rose" />

					<MapPoint label="Dallas" group="Dallas" at={[8, 5]} />
				</>,
			),
		)

		expect(bySlot(container, 'map-geofence')?.getAttribute('class')).toContain('stroke-rose-600')

		// The depot names no colour of its own and takes the group's rather than the
		// next slot — two colours under one label would read as two things. A dot
		// strokes where a zone fills, so the shared hue reads off the stroke here.
		expect(bySlot(container, 'map-point')?.getAttribute('class')).toContain('stroke-rose-600')
	})

	it('toggles every member off through the merged entry', () => {
		const { container } = renderUI(pair())

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-geofence')).toBeNull()

		expect(bySlot(container, 'map-point')).toBeNull()

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-geofence')).not.toBeNull()

		expect(bySlot(container, 'map-point')).not.toBeNull()
	})

	it('emphasises the group together and dims what stands outside it', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapGeofence label="Dallas" group="Dallas" boundary={ZONE} />

					<MapPoint label="Dallas" group="Dallas" at={[8, 5]} />

					<MapPoint label="Reno" at={[12, 6]} />
				</>,
			),
		)

		const [dallas] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(dallas as HTMLButtonElement)

		const dimmed = allBySlot(container, 'map-point').map((point) =>
			point.parentElement?.getAttribute('class')?.includes('opacity-25'),
		)

		// Both halves of the group hold; the ungrouped mark recedes.
		expect(bySlot(container, 'map-geofence')?.parentElement?.getAttribute('class')).not.toContain(
			'opacity-25',
		)

		expect(dimmed).toEqual([false, true])
	})

	it('keeps each member its own tooltip name and table row', () => {
		const { container } = renderUI(pair())

		// The pointer lands on a mark, not on a group, so merging the legend must not
		// merge the readout: the table still carries a row per mark.
		expect(bySlot(container, 'map-table')?.textContent).toContain('Depot')

		expect(bySlot(container, 'map-table')?.textContent).toContain('Next day')
	})

	it('leaves an ungrouped mark its own entry', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapGeofence label="Dallas" group="Dallas" boundary={ZONE} />

					<MapPoint label="Dallas" group="Dallas" at={[8, 5]} />

					<MapPoint label="Reno" at={[12, 6]} />
				</>,
			),
		)

		expect(allBySlot(container, 'map-legend-item').map((item) => item.textContent)).toEqual([
			'Dallas',
			'Reno',
		])
	})
})
