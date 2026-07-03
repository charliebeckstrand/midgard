import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoint } from '../../modules/map'
import { POINT_HIT_RADIUS, POINT_RADIUS } from '../../modules/map/map-constants'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

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

		// A solid fill dot in its slot colour — no ring.
		expect(dot?.getAttribute('class')).toContain('fill-blue-600')

		expect(dot?.getAttribute('class')).not.toContain('stroke')

		expect(dot?.getAttribute('r')).toBe(String(POINT_RADIUS))

		const cx = Number(dot?.getAttribute('cx'))

		expect(cx).toBeGreaterThan(0)

		expect(cx).toBeLessThan(400)

		const hit = bySlot(container, 'map-point-hit')

		expect(hit?.getAttribute('r')).toBe(String(POINT_HIT_RADIUS))

		expect(hit?.getAttribute('cx')).toBe(dot?.getAttribute('cx'))
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

		expect(dots[0]?.getAttribute('class')).toContain('fill-blue-600')

		expect(dots[1]?.getAttribute('class')).toContain('fill-amber-600')

		fireEvent.click(allBySlot(container, 'map-legend-item')[0] as HTMLButtonElement)

		const remaining = allBySlot(container, 'map-point')

		expect(remaining).toHaveLength(1)

		expect(remaining[0]?.getAttribute('class')).toContain('fill-amber-600')
	})
})
