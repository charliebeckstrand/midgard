import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../modules/map'
import { MapPlat, MapRoute } from '../../modules/map'
import { ROUTE_HIT_WIDTH } from '../../modules/map/map-constants'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const STOPS: LngLat[] = [
	[2, 2],
	[15, 5],
	[28, 8],
]

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

describe('MapRoute', () => {
	it('draws the polyline with a wide invisible hit stroke', () => {
		const { container } = renderUI(plat(<MapRoute label="M6" stops={STOPS} />))

		const route = bySlot(container, 'map-route')

		expect(route?.getAttribute('d')).toMatch(/^M/)

		expect(route?.getAttribute('class')).toContain('stroke-blue-600')

		const hit = bySlot(container, 'map-route-hit')

		expect(hit?.getAttribute('stroke-width')).toBe(String(ROUTE_HIT_WIDTH))

		expect(hit?.getAttribute('d')).toBe(route?.getAttribute('d'))
	})

	it('registers a legend entry carrying its label and detail', () => {
		const { container } = renderUI(plat(<MapRoute label="M6" stops={STOPS} detail="230 mi" />))

		const items = allBySlot(container, 'map-legend-item')

		expect(items.map((el) => el.textContent)).toEqual(['M6230 mi'])
	})

	it('prefers street-following path geometry over the straight stops', () => {
		const straight = renderUI(plat(<MapRoute label="M6" stops={STOPS} />))

		const routed = renderUI(
			plat(<MapRoute label="M6" stops={[STOPS[0] as LngLat, STOPS[2] as LngLat]} path={STOPS} />),
		)

		expect(bySlot(routed.container, 'map-route')?.getAttribute('d')).toBe(
			bySlot(straight.container, 'map-route')?.getAttribute('d'),
		)
	})

	it('takes an explicit colour over its slot', () => {
		const { container } = renderUI(plat(<MapRoute label="M6" stops={STOPS} color="rose" />))

		expect(bySlot(container, 'map-route')?.getAttribute('class')).toContain('stroke-rose-600')
	})

	it('raises the tooltip with its name and detail from the hit stroke', () => {
		const { container } = renderUI(plat(<MapRoute label="M6" stops={STOPS} detail="230 mi" />))

		fireEvent.pointerEnter(bySlot(container, 'map-route-hit') as Element, {
			clientX: 100,
			clientY: 40,
		})

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('M6')

		expect(tooltip?.textContent).toContain('230 mi')
	})

	it('unmounts its marks while toggled off', () => {
		const { container } = renderUI(plat(<MapRoute label="M6" stops={STOPS} />))

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-route')).toBeNull()

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-route')).not.toBeNull()
	})

	it('dims against a focused sibling entry', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapRoute label="M6" stops={STOPS} />

					<MapRoute label="M1" stops={[STOPS[0] as LngLat, STOPS[1] as LngLat]} />
				</>,
			),
		)

		const [m6Item] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(m6Item as HTMLButtonElement)

		const groups = allBySlot(container, 'map-route').map(
			(el) => el.parentElement?.getAttribute('class') ?? '',
		)

		expect(groups[0]).not.toContain('opacity-25')

		expect(groups[1]).toContain('opacity-25')
	})
})
