import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoint, MapRoute } from '../../modules/map'
import { allBySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

describe('map legend registry', () => {
	it('registers exactly once under StrictMode double effects', () => {
		const { container } = renderUI(
			<StrictMode>
				<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
					<MapRoute
						label="M6"
						stops={[
							[2, 2],
							[28, 8],
						]}
					/>
				</MapPlat>
			</StrictMode>,
		)

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(1)
	})

	it('keeps a relabelled entry in place, holding its slot colour', () => {
		function plat(firstLabel: string) {
			return (
				<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
					<MapPoint label={firstLabel} at={[5, 5]} />

					<MapPoint label="Yard" at={[25, 5]} />
				</MapPlat>
			)
		}

		const { container, rerender } = renderUI(plat('Depot'))

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual([
			'Depot',
			'Yard',
		])

		rerender(plat('Hub'))

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual([
			'Hub',
			'Yard',
		])

		// The relabelled entry keeps its first-slot blue; its sibling stays orange.
		const dots = allBySlot(container, 'map-point')

		expect(dots[0]?.getAttribute('class')).toContain('fill-blue-600')

		expect(dots[1]?.getAttribute('class')).toContain('fill-orange-600')
	})

	it('drops an unmounted overlay from the legend', () => {
		function plat(withRoute: boolean) {
			return (
				<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
					<MapPoint label="Depot" at={[5, 5]} />

					{withRoute && (
						<MapRoute
							label="M6"
							stops={[
								[2, 2],
								[28, 8],
							]}
						/>
					)}
				</MapPlat>
			)
		}

		const { container, rerender } = renderUI(plat(true))

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(2)

		rerender(plat(false))

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual(['Depot'])
	})
})
