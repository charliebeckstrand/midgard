import { describe, expect, it } from 'vitest'
import { ChoroplethChart } from '../../modules/chart'
import { allBySlot, bySlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const ROWS = [
	{ region: 'A', pop: 0 },
	{ region: 'B', pop: 50 },
	{ region: 'C', pop: 100 },
]

const RANGE = ['#dbeafe', '#1e3a8a']

const fillOf = (el?: Element) => (el as SVGPathElement | undefined)?.style.fill

describe('ChoroplethChart', () => {
	it('shades regions from the series colorRange, joined by idKey / colorKey', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE, colorName: 'Population' }]}
				width={400}
			/>,
		)

		const regions = allBySlot(container, 'map-region')

		expect(regions).toHaveLength(3)

		// The scale reaches the regions as inline fill values; low and high differ.
		expect(fillOf(regions[0])).toBeTruthy()

		expect(fillOf(regions[2])).toBeTruthy()

		expect(fillOf(regions[0])).not.toBe(fillOf(regions[2]))

		// colorName → the data table's value-column header.
		expect(bySlot(container, 'map-table')?.querySelector('thead th')?.textContent).toBe(
			'Population',
		)
	})

	it('defaults its legend to the right', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
			/>,
		)

		// Beside the plot: the reserved side-panel column.
		expect(bySlot(container, 'map-legend-box')?.getAttribute('class')).toContain('lg:w-48')
	})

	it('renders the continuous range scale bar under legend="range"', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				legend="range"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
			/>,
		)

		expect(bySlot(container, 'map-range-legend')).not.toBeNull()

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(0)

		expect(bySlot(container, 'map-range-track')?.getAttribute('style')).toContain('linear-gradient')
	})
})
