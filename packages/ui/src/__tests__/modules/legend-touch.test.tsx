import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { MapPlat, MapPoint } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * A tap on a legend entry toggles it. The tap fires `pointerenter` before its
 * click, and the legend read that as a point. Thus each tap dimmed every other
 * mark until the click landed, and the map faded for a moment on a phone.
 */

const DATA = [
	{ month: 'Jan', revenue: 40, cost: 30 },
	{ month: 'Feb', revenue: 80, cost: 50 },
]

function map() {
	return renderUI(
		<MapPlat aria-label="Warehouses" geography={FIXTURE_GEOJSON} width={400}>
			<MapPoint id="depot" label="Depot" at={[5, 5]} />

			<MapPoint id="yard" label="Yard" at={[25, 5]} />
		</MapPlat>,
	)
}

function bar(axes?: { y: { max: number } }) {
	return renderUI(
		<BarChart
			axes={axes}
			aria-label="Revenue by month"
			data={DATA}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'cost', yName: 'Cost' },
			]}
			width={400}
			legend
			reference={[{ value: 55, label: 'Target' }]}
		/>,
	)
}

/** Whether any part of the drawing has receded behind an emphasis. */
function receded(container: HTMLElement) {
	return container.querySelector('svg [class*="opacity-25"]') !== null
}

describe('a legend entry', () => {
	it.each(['mouse', 'pen'])('emphasizes its marks under a %s point', (pointerType) => {
		const { container } = map()

		fireEvent.pointerEnter(allBySlot(container, 'map-legend-item')[0] as Element, { pointerType })

		expect(receded(container)).toBe(true)
	})

	it('emphasizes nothing under a touch on a map', () => {
		const { container } = map()

		fireEvent.pointerEnter(allBySlot(container, 'map-legend-item')[0] as Element, {
			pointerType: 'touch',
		})

		expect(receded(container)).toBe(false)
	})

	it('emphasizes nothing under a touch on a chart series', () => {
		const { container } = bar()

		fireEvent.pointerEnter(allBySlot(container, 'chart-legend-item')[0] as Element, {
			pointerType: 'touch',
		})

		expect(receded(container)).toBe(false)
	})

	it('emphasizes nothing under a touch on a chart reference', () => {
		const { container } = bar()

		const reference = bySlot(container, 'chart-legend-reference') as Element

		fireEvent.pointerEnter(reference, { pointerType: 'mouse' })

		expect(receded(container)).toBe(true)

		fireEvent.pointerLeave(reference)

		fireEvent.pointerEnter(reference, { pointerType: 'touch' })

		expect(receded(container)).toBe(false)
	})
})

/**
 * A rule that comes back through its chip recedes the marks to it only while a
 * pointer or a visible focus holds the chip, and only when the plot draws it. A
 * tap leaves neither, so a tap that brings the rule back dims nothing.
 */
describe('a chart reference chip that brings its rule back', () => {
	it('recedes nothing after a tap', () => {
		const { container } = bar()

		const reference = bySlot(container, 'chart-legend-reference') as Element

		// A tap: the touch `pointerenter` is not a point, and `pointerleave` comes before the click.
		for (let tap = 0; tap < 2; tap++) {
			fireEvent.pointerEnter(reference, { pointerType: 'touch' })

			fireEvent.pointerLeave(reference, { pointerType: 'touch' })

			fireEvent.click(reference)
		}

		expect(reference).toHaveAttribute('aria-pressed', 'true')

		expect(receded(container)).toBe(false)
	})

	it('recedes the marks while the mouse rests on the chip', () => {
		const { container } = bar()

		const reference = bySlot(container, 'chart-legend-reference') as Element

		fireEvent.pointerEnter(reference, { pointerType: 'mouse' })

		fireEvent.click(reference)

		expect(receded(container)).toBe(false)

		fireEvent.click(reference)

		expect(reference).toHaveAttribute('aria-pressed', 'true')

		expect(receded(container)).toBe(true)
	})

	it('recedes nothing for a rule outside a pinned domain', () => {
		const { container } = bar({ y: { max: 50 } })

		const reference = bySlot(container, 'chart-legend-reference') as Element

		fireEvent.pointerEnter(reference, { pointerType: 'mouse' })

		expect(receded(container)).toBe(false)

		fireEvent.click(reference)

		fireEvent.click(reference)

		expect(reference).toHaveAttribute('aria-pressed', 'true')

		expect(receded(container)).toBe(false)
	})
})
