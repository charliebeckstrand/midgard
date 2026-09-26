import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { stackedAreas } from '../../modules/chart/engine/chart-geometry/area'
import { allBySlot, bySlot, fireEvent, getSlot, renderUI } from '../helpers'

const DATA = [
	{ day: 'Mon', organic: 20, paid: 10 },
	{ day: 'Tue', organic: 28, paid: 14 },
	{ day: 'Wed', organic: 24, paid: 12 },
]

function chart(extra?: Partial<Parameters<typeof AreaChart<(typeof DATA)[number]>>[0]>) {
	return (
		<AreaChart
			aria-label="Traffic by channel"
			data={DATA}
			series={[
				{ xKey: 'day', yKey: 'organic', yName: 'Organic' },
				{ xKey: 'day', yKey: 'paid', yName: 'Paid' },
			]}
			width={400}
			{...extra}
		/>
	)
}

describe('AreaChart', () => {
	it('fills an area with a band-edge line per series', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-area')).toHaveLength(2)

		expect(allBySlot(container, 'chart-line')).toHaveLength(2)

		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(2)
	})

	it('reads each series value in the tooltip, not the stacked total', () => {
		const { container } = renderUI(chart({ stacked: true, crosshair: false }))

		const hit = bySlot(container, 'chart-hit') as Element

		// (200, 100) sits inside the stacked ribbons near Tue.
		fireEvent.pointerMove(hit, { clientX: 200, clientY: 100 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Tue')

		expect(tooltip?.textContent).toContain('28')

		expect(tooltip?.textContent).toContain('14')

		// Above the stack the tooltip stays away.
		fireEvent.pointerMove(hit, { clientX: 200, clientY: 5 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('closes the unstacked fill at the zero baseline, not the plot floor', () => {
		// A symmetric domain around zero puts the zero line at the plot's vertical
		// middle (~92 in a 200px frame), well above the ~176px floor. The wash must
		// bottom at that zero line, not run all the way to the floor as it did when
		// it closed to `plot.y + plot.height`.
		const { container } = renderUI(
			<AreaChart
				aria-label="Net flow"
				data={[
					{ day: 'Mon', net: 10 },
					{ day: 'Tue', net: -10 },
				]}
				series={[{ xKey: 'day', yKey: 'net', yName: 'Net' }]}
				width={400}
				height={200}
				axes={{ y: { min: -10, max: 10 } }}
			/>,
		)

		const d = bySlot(container, 'chart-area')?.getAttribute('d') ?? ''

		const baseline = Number(/([\d.]+)\s+Z$/.exec(d)?.[1])

		// The zero line sits near the middle (~92); the floor is ~176.
		expect(baseline).toBeLessThan(150)
	})

	it('marks band-edge points and smooths only when unstacked', () => {
		const dotted = renderUI(chart({ points: true }))

		expect(allBySlot(dotted.container, 'chart-point')).toHaveLength(6)

		const smooth = renderUI(chart({ interpolation: 'smooth' }))

		expect(bySlot(smooth.container, 'chart-line')?.getAttribute('d')).toContain('C')
	})

	it('draws a snapping y-rule by default, carrying the tooltip anywhere in the plot', () => {
		const { container } = renderUI(chart())

		const hit = bySlot(container, 'chart-hit') as Element

		// A point well above the marks — off any fill — still reads, because the
		// default snap carries the tooltip to the nearest band-edge point.
		fireEvent.pointerMove(hit, { clientX: 200, clientY: 5 })

		expect(bySlot(container, 'chart-crosshair-y')).not.toBeNull()

		expect(bySlot(container, 'chart-crosshair-x')).toBeNull()

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Tue')
	})

	it('lets the stacked tooltip float above the fill, tracking the pointer inside the plot', () => {
		const { container } = renderUI(chart({ stacked: true }))

		const hit = bySlot(container, 'chart-hit') as Element

		// Well above the stacked ribbons — off any fill — the snapping tooltip still
		// reads the pointed category, riding the pointer's height rather than diving
		// into the fill for a series value.
		fireEvent.pointerMove(hit, { clientX: 200, clientY: 5 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Tue')

		expect(tooltip?.textContent).toContain('28')

		expect(tooltip?.textContent).toContain('14')
	})

	it('drops the snap under smooth interpolation, gating the tooltip to the marks', () => {
		const { container } = renderUI(chart({ interpolation: 'smooth' }))

		const hit = bySlot(container, 'chart-hit') as Element

		// Off the fills the unsnapped rule leaves the tooltip closed.
		fireEvent.pointerMove(hit, { clientX: 200, clientY: 5 })

		expect(bySlot(container, 'chart-crosshair-y')).not.toBeNull()

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('reads an empty stacked series list the way it reads an empty unstacked one', () => {
		// A literal `series={[]}` resolves no series, but the band still spans the
		// data rows. The stacked stops count their columns from the band, and the
		// unstacked stops do too. Nothing draws and nothing takes a stop. Each
		// pointer column and each key reads the same as in the unstacked chart.
		const readout = (stacked: boolean) => {
			const { container } = renderUI(chart({ series: [], stacked }))

			const hit = getSlot(container, 'chart-hit')

			const reads = [100, 200, 300].map((clientX) => {
				fireEvent.pointerMove(hit, { clientX, clientY: 100 })

				return [
					bySlot(container, 'chart-crosshair-y') !== null,
					bySlot(container, 'tooltip-content')?.textContent ?? null,
				]
			})

			fireEvent.pointerLeave(hit)

			fireEvent.keyDown(getSlot(container, 'chart'), { key: 'ArrowRight' })

			return {
				areas: allBySlot(container, 'chart-area').length,
				reads,
				keyed: bySlot(container, 'tooltip-content')?.textContent ?? null,
			}
		}

		const stacked = readout(true)

		expect(stacked.areas).toBe(0)

		expect(stacked.keyed).toBeNull()

		expect(stacked).toEqual(readout(false))
	})

	it('still renders under animate', () => {
		const { container } = renderUI(chart({ stacked: true, animate: true }))

		expect(allBySlot(container, 'chart-area')).toHaveLength(2)
	})
})

describe('AreaChart value domain', () => {
	/** The y of the x-axis rule, and the y-axis ticks as `label@y`, of a one-series chart. */
	function axisFloor(labels: boolean) {
		const { container, unmount } = renderUI(
			<AreaChart
				aria-label="Revenue"
				width={400}
				height={240}
				points
				labels={labels ? { extremes: true } : undefined}
				data={[
					{ m: 'Jan', r: 10 },
					{ m: 'Feb', r: 50 },
					{ m: 'Mar', r: 30 },
				]}
				series={[{ xKey: 'm', yKey: 'r', yName: 'Revenue' }]}
			/>,
		)

		const y = Number(getSlot(container, 'chart-axis-x').querySelector('line')?.getAttribute('y1'))

		const ticks = [...getSlot(container, 'chart-axis-y').querySelectorAll('text')].map(
			(node) => `${node.textContent}@${node.getAttribute('y')}`,
		)

		unmount()

		return { y, ticks }
	}

	it('keeps the zero tick on the axis rule when the extreme value labels add headroom', () => {
		const plain = axisFloor(false)

		const labeled = axisFloor(true)

		// The headroom widens the top of the domain only. A lower floor leaves an empty strip under the area.
		expect(plain.ticks[0]).toBe(`0@${plain.y}`)

		expect(labeled.ticks[0]).toBe(`0@${labeled.y}`)
	})

	it('keeps a stacked band of 10 inside the value axis when the next series is negative', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Stacked"
				data={[
					{ c: 'A', a: 10, b: -5 },
					{ c: 'B', a: 10, b: -5 },
				]}
				series={[
					{ xKey: 'c', yKey: 'a' },
					{ xKey: 'c', yKey: 'b' },
				]}
				stacked
				width={400}
				height={300}
			/>,
		)

		const ticks = [...getSlot(container, 'chart-axis-y').querySelectorAll('text')]
			.map((text) => Number((text.textContent ?? '').replace(/[^\d.-]/g, '')))
			.filter(Number.isFinite)

		// The top edge of the first band is at 10 before the second band pulls it back to 5.
		expect(Math.max(...ticks)).toBeGreaterThanOrEqual(10)
	})
})

describe('stackedAreas', () => {
	const xs = [0, 10, 20]

	const map = (value: number) => 100 - value

	it('rides each band on the running total below it', () => {
		const [first, second] = stackedAreas(
			[
				[20, 30, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// First band's top edge sits at its own values.
		expect(first?.points.map((p) => p.y)).toEqual([80, 70, 75])

		// Second band's top edge sits at the cumulative total (value + first).
		expect(second?.points.map((p) => p.y)).toEqual([70, 60, 65])
	})

	it('counts a missing value as zero so the stack stays continuous', () => {
		const [, second] = stackedAreas(
			[
				[20, null, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// At the gap the first band contributes 0, so the second rides on 10 alone.
		expect(second?.points[1]?.y).toBe(map(10))
	})

	it('closes each ribbon between its top edge and the one below', () => {
		const [first] = stackedAreas([[20, 30, 25]], xs, map)

		expect(first?.area.startsWith('M ')).toBe(true)

		expect(first?.area.endsWith('Z')).toBe(true)
	})
})
