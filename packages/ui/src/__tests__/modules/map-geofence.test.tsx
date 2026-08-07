import { geoDistance } from 'd3-geo'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LngLat } from '../../modules/map'
import { MapGeofence, MapPlat, MapPoint } from '../../modules/map'
import {
	EARTH_RADIUS_METERS,
	GEOFENCE_CIRCLE_STEPS,
	GEOFENCE_STROKE_WIDTH,
	ROUTE_HIT_WIDTH,
} from '../../modules/map/engine/map-constants'
import { circleRing } from '../../modules/map/engine/map-geofence'
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

		// The outline's width rides device pixels — a late refit scales the
		// geometry, never the stroke.
		expect(edge?.getAttribute('vector-effect')).toBe('non-scaling-stroke')

		const wash = bySlot(container, 'map-geofence-wash')

		expect(wash?.getAttribute('class')).toContain('fill-blue-600')

		expect(wash?.getAttribute('d')).toBe(edge?.getAttribute('d'))

		const hit = bySlot(container, 'map-geofence-hit')

		expect(hit?.getAttribute('stroke-width')).toBe(String(ROUTE_HIT_WIDTH))

		expect(hit?.getAttribute('d')).toBe(edge?.getAttribute('d'))
	})

	it('answers the pointer on its edge alone, so marks inside it stay reachable', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		const hit = bySlot(container, 'map-geofence-hit')

		// A filled hit target would swallow every mark the zone encloses.
		expect(hit?.getAttribute('fill')).toBe('none')

		expect(hit?.getAttribute('pointer-events')).toBe('stroke')
	})

	it('keeps its wash out of the pointer, so the regions under it stay live', () => {
		const { container } = renderUI(plat(<MapGeofence label="Zone A" boundary={ZONE} />))

		// The wash is the module's one drawn shape with an area. Left hittable it
		// answers the pointer across the whole zone — stealing the hover and the
		// click from every region the zone covers, and from any mark it encloses
		// that draws beneath it.
		expect(bySlot(container, 'map-geofence-wash')?.getAttribute('pointer-events')).toBe('none')
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
