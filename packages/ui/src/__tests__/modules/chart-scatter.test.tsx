import { describe, expect, it } from 'vitest'
import { BubbleChart } from '../../modules/chart/bubble-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import {
	diameterRange,
	nearestCenterIndex,
	sizeRadius,
	uniqueXValues,
} from '../../modules/chart/scatter-chart/scatter-chart-geometry'
import { act, allBySlot, bySlot, fireEvent, renderUI, userEvent } from '../helpers'

type Stop = { distance: unknown; dwell: unknown; weight?: unknown }

const STOPS: Stop[] = [
	{ distance: 12, dwell: 34, weight: 4 },
	{ distance: 48, dwell: 18, weight: 16 },
	{ distance: 30, dwell: 25, weight: 9 },
]

function points(container: HTMLElement): SVGCircleElement[] {
	return [...container.querySelectorAll<SVGCircleElement>('[data-slot="chart-scatter-point"]')]
}

describe('scatter geometry', () => {
	it('keys on the ascending unique x values across series', () => {
		expect(
			uniqueXValues([
				[{ x: 3, y: 1, size: null }],
				[
					{ x: 1, y: 2, size: null },
					{ x: 3, y: 4, size: null },
				],
			]),
		).toEqual([1, 3])
	})

	it('resolves the nearest center however unevenly they sit', () => {
		expect(nearestCenterIndex(9, [0, 10, 100])).toBe(1)

		expect(nearestCenterIndex(60, [0, 10, 100])).toBe(2)

		expect(nearestCenterIndex(5, [])).toBeNull()
	})

	it('scales bubble radii by area between the diameter range ends', () => {
		const diameters = diameterRange(8, 28)

		const small = sizeRadius(1, [1, 100], diameters)

		const large = sizeRadius(100, [1, 100], diameters)

		expect(small).toBeCloseTo(4)

		expect(large).toBeCloseTo(14)

		// Area-true: a quarter of the size is half the radius span, not a quarter.
		expect(sizeRadius(25, [0, 100], diameters)).toBeCloseTo(4 + (14 - 4) / 2)
	})

	it('reads equal sizes as mid-range and a sizeless point as smallest', () => {
		const diameters = diameterRange(8, 28)

		expect(sizeRadius(7, [7, 7], diameters)).toBeCloseTo(9)

		expect(sizeRadius(null, [1, 100], diameters)).toBeCloseTo(4)
	})
})

describe('ScatterChart', () => {
	it('draws one disc per parseable row and drops junk rows, never the scale', () => {
		const ragged: Stop[] = [
			...STOPS,
			{ distance: 'twelve', dwell: 30 },
			{ distance: 61, dwell: undefined },
			{ distance: Number.NaN, dwell: 5 },
		]

		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={ragged}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(points(container)).toHaveLength(3)

		// Numeric ticks line both axes.
		expect(bySlot(container, 'chart-axis-y')).not.toBeNull()

		expect(bySlot(container, 'chart-axis-x')).not.toBeNull()
	})

	it('survives duplicate points and joins them in the readout', () => {
		const doubled: Stop[] = [
			{ distance: 10, dwell: 5 },
			{ distance: 10, dwell: 5 },
			{ distance: 10, dwell: 9 },
		]

		const { container } = renderUI(
			<ScatterChart
				aria-label="Duplicates"
				data={doubled}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(points(container)).toHaveLength(3)

		// One unique-x column carries all three values, coincident ones included.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('5, 5, 9')
	})

	it('holds up against wide magnitude ranges and a lone point', () => {
		const wide: Stop[] = [
			{ distance: 0.002, dwell: 1 },
			{ distance: 480000, dwell: 900000 },
		]

		const spread = renderUI(
			<ScatterChart
				aria-label="Wide"
				data={wide}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		for (const disc of points(spread.container)) {
			expect(Number.isFinite(Number(disc.getAttribute('cx')))).toBe(true)

			expect(Number.isFinite(Number(disc.getAttribute('cy')))).toBe(true)
		}

		const lone = renderUI(
			<ScatterChart
				aria-label="Lone"
				data={[{ distance: 5, dwell: 5 }]}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(points(lone.container)).toHaveLength(1)

		expect(Number.isFinite(Number(points(lone.container)[0]?.getAttribute('cx')))).toBe(true)
	})

	it('toggles a series off through the legend', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<ScatterChart
				aria-label="Two series"
				data={STOPS}
				width={480}
				series={[
					{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
					{ xKey: 'distance', yKey: 'weight', yName: 'Weight' },
				]}
			/>,
		)

		expect(allBySlot(container, 'chart-scatter-series')).toHaveLength(2)

		await user.click(
			container.querySelectorAll('button[data-slot="chart-legend-item"]')[1] as Element,
		)

		expect(allBySlot(container, 'chart-scatter-series')).toHaveLength(1)
	})

	it('walks the unique x columns from the keyboard, formatted per axis', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				formatXValue={(value) => `${value} mi`}
			/>,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		act(() => plot.focus())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const tip = bySlot(container, 'tooltip-content')

		// The first column is the smallest x, however the rows arrived.
		expect(tip?.textContent).toContain('12 mi')

		expect(tip?.textContent).toContain('34')
	})

	it('pins the readout to a click under trigger click, ignoring hover', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				crosshair={{ snap: true }}
				tooltip={{ trigger: 'click' }}
			/>,
		)

		const hit = bySlot(container, 'chart-hit') as Element

		// The hit layer reads as clickable.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		// Movement no longer summons the readout under the click trigger.
		fireEvent.pointerMove(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// A click pins the snapped readout, and clicking the same column clears it.
		fireEvent.click(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		fireEvent.click(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})
})

describe('BubbleChart', () => {
	it('sizes each disc by its measure and reads it beside the value', () => {
		const { container } = renderUI(
			<BubbleChart
				aria-label="Dwell against distance, sized by weight"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
			/>,
		)

		const radii = points(container).map((disc) => Number(disc.getAttribute('r')))

		expect(radii).toHaveLength(3)

		// weight 4 < 9 < 16 orders the radii, clamped inside the diameter range.
		const byWeight = [radii[0], radii[2], radii[1]] as number[]

		expect(byWeight[0]).toBeLessThan(byWeight[1] as number)

		expect(byWeight[1]).toBeLessThan(byWeight[2] as number)

		expect(Math.min(...radii)).toBeGreaterThanOrEqual(4)

		expect(Math.max(...radii)).toBeLessThanOrEqual(14)

		// The data table names the size measure beside each value.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('34 (weight: 4)')
	})
})
