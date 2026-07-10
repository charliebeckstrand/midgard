import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoint } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_RADIUS } from '../../modules/map/map-constants'
import { allBySlot, allRegions, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

describe('MapPoint', () => {
	it('draws a solid dot at the projected position with a wide hit circle', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[15, 5]} />))

		const dot = bySlot(container, 'map-point')

		// A solid dot: a zero-length round cap in the slot colour, stroke-painted so
		// the non-scaling stroke holds it at device-pixel size through a resize.
		expect(dot?.getAttribute('class')).toContain('stroke-blue-600')

		expect(dot?.getAttribute('stroke-width')).toBe(String(POINT_RADIUS * 2))

		expect(dot?.getAttribute('stroke-linecap')).toBe('round')

		expect(dot?.getAttribute('vector-effect')).toBe('non-scaling-stroke')

		const at = dot?.getAttribute('d')?.match(/^M([\d.]+),([\d.]+)l0,0$/)

		const cx = Number(at?.[1])

		expect(cx).toBeGreaterThan(0)

		expect(cx).toBeLessThan(400)

		const hit = bySlot(container, 'map-point-hit')

		expect(hit?.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		expect(Number(hit?.getAttribute('cx'))).toBeCloseTo(cx, 1)
	})

	it('registers a legend entry and answers hover with the tooltip', () => {
		const { container } = renderUI(plat(<MapPoint label="Depot" at={[15, 5]} detail="18 loads" />))

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual([
			'Depot18 loads',
		])

		fireEvent.pointerEnter(bySlot(container, 'map-point-hit') as Element, {
			clientX: 200,
			clientY: 30,
		})

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Depot')

		expect(tooltip?.textContent).toContain('18 loads')
	})

	it('unmounts while toggled off and keeps its slot colour beside siblings', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapPoint label="Depot" at={[5, 5]} />

					<MapPoint label="Yard" at={[25, 5]} color="amber" />
				</>,
			),
		)

		const dots = allBySlot(container, 'map-point')

		expect(dots[0]?.getAttribute('class')).toContain('stroke-blue-600')

		expect(dots[1]?.getAttribute('class')).toContain('stroke-amber-600')

		fireEvent.click(allBySlot(container, 'map-legend-item')[0] as HTMLButtonElement)

		const remaining = allBySlot(container, 'map-point')

		expect(remaining).toHaveLength(1)

		expect(remaining[0]?.getAttribute('class')).toContain('stroke-amber-600')
	})

	it('trades the pointed-mark recede with the regions', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				width={400}
			>
				<MapPoint label="Depot" at={[15, 5]} />
			</MapPlat>,
		)

		const dotGroup = () => bySlot(container, 'map-point')?.parentElement?.getAttribute('class')

		const regionGroups = () => allRegions(container).map((el) => el.getAttribute('class') ?? '')

		// Pointing the dot isolates it: every region recedes behind it.
		fireEvent.pointerEnter(bySlot(container, 'map-point-hit') as Element, {
			clientX: 200,
			clientY: 30,
		})

		expect(dotGroup()).not.toContain('opacity-25')

		expect(regionGroups().every((cls) => cls.includes('opacity-25'))).toBe(true)

		// Pointing a matched region isolates it the other way: the dot recedes.
		const [alpha] = allRegions(container)

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(regionGroups()[0]).not.toContain('opacity-25')

		expect(dotGroup()).toContain('opacity-25')

		fireEvent.pointerLeave(bySlot(container, 'map-regions') as Element)

		expect(dotGroup()).not.toContain('opacity-25')
	})
})
