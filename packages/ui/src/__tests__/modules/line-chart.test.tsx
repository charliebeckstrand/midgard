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
			x="week"
			series={[
				{ key: 'signups', label: 'Signups' },
				{ key: 'churn', label: 'Churn' },
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

	it('snaps the crosshair to the hovered category with guideLine y', () => {
		const { container } = renderUI(chart({ guideLine: { y: true } }))

		expect(bySlot(container, 'chart-crosshair')).toBeNull()

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 10 })

		const crosshair = bySlot(container, 'chart-crosshair')

		expect(crosshair).not.toBeNull()

		// Dashed, matching the horizontal x guide.
		expect(crosshair?.getAttribute('stroke-dasharray')).toBe('4 4')

		expect(bySlot(container, 'chart-tooltip')?.textContent).toContain('W1')
	})

	it('leaves the crosshair opt-in — none by default', () => {
		const { container } = renderUI(chart())

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 10 })

		expect(bySlot(container, 'chart-crosshair')).toBeNull()

		// The tooltip still tracks the category without a guide line.
		expect(bySlot(container, 'chart-tooltip')?.textContent).toContain('W1')
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
