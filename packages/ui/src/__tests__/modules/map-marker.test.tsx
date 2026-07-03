import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../modules/map'
import { MapMarker, MapPlat } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const START: LngLat = [2, 2]

const END: LngLat = [28, 8]

function plat(children: ReactNode) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

describe('MapMarker', () => {
	it('draws solid origin and destination pins and the connector between them', () => {
		const { container } = renderUI(plat(<MapMarker label="A → C" start={START} end={END} />))

		const start = bySlot(container, 'map-marker-start')?.querySelector('circle')

		const end = bySlot(container, 'map-marker-end')?.querySelector('circle')

		// Both pins are solid fill dots in the slot colour — no ring.
		expect(start?.getAttribute('class')).toContain('fill-blue-600')

		expect(start?.getAttribute('class')).not.toContain('stroke')

		expect(end?.getAttribute('class')).toContain('fill-blue-600')

		expect(end?.getAttribute('class')).not.toContain('stroke')

		const connector = bySlot(container, 'map-marker-path')

		expect(connector?.getAttribute('d')).toMatch(/^M/)

		expect(connector?.getAttribute('class')).toContain('stroke-blue-600')
	})

	it('follows routed path geometry through intermediate waypoints', () => {
		const straight = renderUI(plat(<MapMarker label="A → C" start={START} end={END} />))

		const routed = renderUI(
			plat(<MapMarker label="A → C" start={START} end={END} path={[START, [15, 8], END]} />),
		)

		expect(bySlot(routed.container, 'map-marker-path')?.getAttribute('d')).not.toBe(
			bySlot(straight.container, 'map-marker-path')?.getAttribute('d'),
		)
	})

	it('registers one legend entry for the pair and answers hover on any part', () => {
		const { container } = renderUI(
			plat(<MapMarker label="A → C" start={START} end={END} detail="2,015 mi" />),
		)

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual([
			'A → C2,015 mi',
		])

		fireEvent.pointerEnter(bySlot(container, 'map-marker-start-hit') as Element, {
			clientX: 30,
			clientY: 60,
		})

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('A → C')

		fireEvent.pointerLeave(bySlot(container, 'map-marker') as Element)

		fireEvent.pointerEnter(bySlot(container, 'map-marker-hit') as Element, {
			clientX: 200,
			clientY: 40,
		})

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('2,015 mi')
	})

	it('unmounts while toggled off', () => {
		const { container } = renderUI(plat(<MapMarker label="A → C" start={START} end={END} />))

		fireEvent.click(bySlot(container, 'map-legend-item') as HTMLButtonElement)

		expect(bySlot(container, 'map-marker')).toBeNull()
	})
})
