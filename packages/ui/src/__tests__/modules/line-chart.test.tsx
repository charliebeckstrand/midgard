import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { lineGeometry } from '../../modules/chart/line-chart/line-chart-geometry'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ week: 'W1', signups: 12, churn: 3 },
	{ week: 'W2', signups: 18, churn: 5 },
	{ week: 'W3', signups: 15, churn: 4 },
]

function chart(extra?: Partial<Parameters<typeof LineChart<(typeof DATA)[number]>>[0]>) {
	return (
		<LineChart
			aria-label="Signups per week"
			data={DATA}
			series={[
				{ xKey: 'week', yKey: 'signups', yName: 'Signups' },
				{ xKey: 'week', yKey: 'churn', yName: 'Churn' },
			]}
			width={400}
			{...extra}
		/>
	)
}

describe('LineChart', () => {
	it('draws one line per series with line-swatched legend keys', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-line')).toHaveLength(2)

		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(2)
	})

	it('keeps areas and markers opt-in', () => {
		const bare = renderUI(chart())

		expect(allBySlot(bare.container, 'chart-area')).toHaveLength(0)

		expect(allBySlot(bare.container, 'chart-point')).toHaveLength(0)

		const dressed = renderUI(chart({ fill: true, points: true }))

		expect(allBySlot(dressed.container, 'chart-area')).toHaveLength(2)

		expect(allBySlot(dressed.container, 'chart-point')).toHaveLength(6)
	})

	it('draws a dashed vertical rule with crosshair y', () => {
		const { container } = renderUI(chart({ crosshair: { x: false, y: true } }))

		expect(bySlot(container, 'chart-crosshair-y')).toBeNull()

		// (62, 77) sits on W1's signups point; the crosshair tracks regardless.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 62, clientY: 77 })

		const rule = bySlot(container, 'chart-crosshair-y')

		expect(rule).not.toBeNull()

		// Dashed, matching the horizontal x rule.
		expect(rule?.getAttribute('stroke-dasharray')).toBe('4 4')

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('W1')
	})

	it('leaves the crosshair opt-in — none by default', () => {
		const { container } = renderUI(chart())

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 62, clientY: 77 })

		expect(bySlot(container, 'chart-crosshair-y')).toBeNull()

		// The tooltip still reads the category while the pointer rides the line.
		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('W1')
	})

	it('keeps the tooltip off the air around the lines', () => {
		const { container } = renderUI(chart())

		const hit = bySlot(container, 'chart-hit') as Element

		// Far above both lines at W1: the crosshair may track, the tooltip won't.
		fireEvent.pointerMove(hit, { clientX: 62, clientY: 10 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.pointerMove(hit, { clientX: 62, clientY: 77 })

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()
	})

	it('summons the tooltip off the lines when the crosshair snaps', () => {
		const { container } = renderUI(chart({ crosshair: { x: true, y: true, snap: true } }))

		// Far above both lines at W1 — a bare tooltip reads nothing here, but the
		// snapping crosshair carries it to the nearest point.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 62, clientY: 10 })

		const readout = bySlot(container, 'tooltip-content') as HTMLElement | null

		expect(readout).not.toBeNull()

		// Snapped, it still lists every series at the pointed category.
		expect(readout?.textContent).toContain('W1')

		expect(readout?.textContent).toContain('Signups')

		expect(readout?.textContent).toContain('Churn')
	})

	it('still gates the tooltip on a mark when the crosshair does not snap', () => {
		const { container } = renderUI(chart({ crosshair: { x: true, y: true } }))

		// Off the lines the crosshair tracks, but without snap the tooltip waits
		// for a mark hit.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 62, clientY: 10 })

		expect(bySlot(container, 'chart-crosshair-y')).not.toBeNull()

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('still renders the marks under animate', () => {
		const { container } = renderUI(chart({ animate: true, points: true }))

		expect(allBySlot(container, 'chart-line')).toHaveLength(2)

		expect(allBySlot(container, 'chart-point')).toHaveLength(6)
	})

	it('curves the lines under smooth interpolation', () => {
		const { container } = renderUI(chart({ interpolation: 'smooth' }))

		expect(bySlot(container, 'chart-line')?.getAttribute('d')).toContain('C')
	})

	it('orders the legend by each series’ latest value, largest first', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Two metrics by month"
				data={[
					{ month: 'Jan', low: 10, high: 20 },
					{ month: 'Feb', low: 12, high: 40 },
				]}
				series={[
					{ xKey: 'month', yKey: 'low', yName: 'Low' },
					{ xKey: 'month', yKey: 'high', yName: 'High' },
				]}
				width={400}
			/>,
		)

		// 'High' ends at 40 over 'Low' at 12, so it leads the legend though it is
		// the second series — the switches read in the lines' visible top-down order.
		expect(allBySlot(container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'High',
			'Low',
		])
	})

	it('toggles the series a reordered entry names, not its display slot', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Two metrics by month"
				data={[
					{ month: 'Jan', low: 10, high: 20 },
					{ month: 'Feb', low: 12, high: 40 },
				]}
				series={[
					{ xKey: 'month', yKey: 'low', yName: 'Low' },
					{ xKey: 'month', yKey: 'high', yName: 'High' },
				]}
				width={400}
			/>,
		)

		const [high, low] = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		// 'High' leads the legend but is the second series; clicking it must strike
		// 'High' — the series it names, keyed by its own index — and leave 'Low' on.
		fireEvent.click(high as HTMLButtonElement)

		expect(high).toHaveAttribute('aria-pressed', 'false')

		expect(low).toHaveAttribute('aria-pressed', 'true')

		expect(allBySlot(container, 'chart-line')).toHaveLength(1)
	})
})

describe('lineGeometry', () => {
	const identity = (value: number) => value

	it('breaks the path at gaps and keeps isolated points visible', () => {
		const geometry = lineGeometry([1, 2, null, 4, null], [0, 10, 20, 30, 40], identity, 100)

		expect(geometry.segments).toHaveLength(1)

		expect(geometry.segments[0]).toBe('M 0 1 L 10 2')

		// The run of one at x=30 has no segment; it must surface as a marker.
		expect(geometry.isolated).toEqual([{ x: 30, y: 4 }])

		expect(geometry.points).toHaveLength(3)
	})

	it('closes each area run down to the baseline', () => {
		const geometry = lineGeometry([1, 2], [0, 10], identity, 100)

		expect(geometry.areas[0]).toBe('M 0 1 L 10 2 L 10 100 L 0 100 Z')
	})

	it('yields nothing for an all-null series', () => {
		const geometry = lineGeometry([null, null], [0, 10], identity, 100)

		expect(geometry.segments).toHaveLength(0)

		expect(geometry.points).toHaveLength(0)
	})

	it('draws a monotone cubic under smooth interpolation without overshooting', () => {
		const linear = lineGeometry([10, 30, 20], [0, 10, 20], identity, 100, 'linear')

		expect(linear.segments[0]).not.toContain('C')

		const smooth = lineGeometry([10, 30, 20], [0, 10, 20], identity, 100, 'smooth')

		// Cubic segments, and the peak's tangent flattens so the curve can't
		// rise past y=30 (in this identity map, past the data max).
		expect(smooth.segments[0]).toContain('C')

		const ys = [...(smooth.segments[0] as string).matchAll(/[\d.]+ ([\d.]+)/g)].map((m) =>
			Number(m[1]),
		)

		expect(Math.max(...ys)).toBeLessThanOrEqual(30)
	})

	it('stays a straight segment when a run is too short to curve', () => {
		const smooth = lineGeometry([10, 30], [0, 10], identity, 100, 'smooth')

		expect(smooth.segments[0]).toBe('M 0 10 L 10 30')
	})
})
