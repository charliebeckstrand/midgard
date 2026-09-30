import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { ComboChart } from '../../modules/chart/combo-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

describe('LineChart value labels', () => {
	it('keeps each label node through a resize', () => {
		// A resize moves the labels, and the data stays. A label keyed on its
		// position mounted again at each width, and an animated one faded out and
		// in: it blinked on each resize.
		const chart = (width: number) => (
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={width}
				animate
				labels={{ extremes: true }}
			/>
		)

		const { container, rerender } = renderUI(chart(400))

		const peak = () =>
			allBySlot(container, 'chart-value-label').find((node) => node.textContent === '90')

		const before = peak()

		const x = before?.getAttribute('x')

		rerender(chart(520))

		expect(peak()).toBe(before)

		expect(peak()?.getAttribute('x')).not.toBe(x)
	})

	it('renders the selective labels over the marks', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				labels={{ extremes: true }}
			/>,
		)

		const drawn = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		// The peak (90) and trough (40) are labeled; the middle point is not.
		expect(drawn).toContain('90')

		expect(drawn).toContain('40')

		expect(drawn).not.toContain('65')
	})

	it('keeps the extreme labels on their natural sides through the reserved headroom', () => {
		// Both raw extremes land exactly on nice tick steps, so without the
		// reserved headroom each would touch its plot edge and flip onto the
		// line. The reservation clears the flip threshold with slack — the peak's
		// label stays above the peak and the trough's below the trough, and a
		// resize never dances them across the boundary.
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				points
				labels={{ extremes: true }}
			/>,
		)

		const labels = allBySlot(container, 'chart-value-label')

		const y = (text: string) =>
			Number(labels.find((node) => node.textContent === text)?.getAttribute('y'))

		const points = allBySlot(container, 'chart-point').map((node) =>
			Number(node.getAttribute('cy')),
		)

		const [troughY, peakY] = [points[0] as number, points[1] as number]

		expect(y('90')).toBeLessThan(peakY)

		expect(y('40')).toBeGreaterThan(troughY)
	})

	it('keeps a first-point label at the domain ceiling above its point', () => {
		// Endpoints reserve headroom too: the first value is also the data max
		// and lands exactly on the nice tick ceiling — without the reservation
		// its label would clip the plot top and flip below, onto the descending
		// line.
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 90 },
					{ month: 'Feb', revenue: 40 },
					{ month: 'Mar', revenue: 60 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				points
				labels={{ endpoints: true }}
			/>,
		)

		const first = allBySlot(container, 'chart-value-label').find(
			(node) => node.textContent === '90',
		)

		const firstPoint = allBySlot(container, 'chart-point')[0]

		expect(Number(first?.getAttribute('y'))).toBeLessThan(Number(firstPoint?.getAttribute('cy')))
	})

	it('labels reference rules with their label when references is on', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month against a target"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				reference={[{ value: 70, label: 'Target' }]}
				labels={{ extremes: true, references: true }}
			/>,
		)

		// The point labels still draw for the extremes...
		const points = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		expect(points).toContain('90')

		expect(points).toContain('40')

		// ...and the reference rule now carries its own standing label.
		expect(bySlot(container, 'chart-reference-label')?.textContent).toBe('Target')
	})
})

describe('AreaChart stacked value labels', () => {
	it('labels each stacked category by its own value across a gap', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Signups by week"
				data={[
					{ week: 'W1', a: undefined },
					{ week: 'W2', a: 10 },
					{ week: 'W3', a: 20 },
				]}
				series={[{ xKey: 'week', yKey: 'a', yName: 'A' }]}
				stacked
				width={400}
				labels={{ endpoints: true }}
			/>,
		)

		const drawn = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		// The right-edge endpoint reads its own value (20), not the 0 the gap-shift
		// bug left there; the leading gap takes no label.
		expect(drawn).toContain('20')

		expect(drawn).not.toContain('0')
	})
})

describe('AreaChart value-label headroom', () => {
	it('keeps the extreme labels on their natural sides, above the peak', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={[
					{ m: 'Jan', r: 40 },
					{ m: 'Feb', r: 100 },
					{ m: 'Mar', r: 65 },
				]}
				series={[{ xKey: 'm', yKey: 'r', yName: 'Revenue' }]}
			/>,
		)

		const label = allBySlot(container, 'chart-value-label').find((n) => n.textContent === '100')

		const peak = allBySlot(container, 'chart-point')[1]

		expect(Number(label?.getAttribute('y'))).toBeLessThan(Number(peak?.getAttribute('cy')))
	})
})

describe('value-label headroom with a series hidden from the legend', () => {
	// Two series, then the second hidden: one series draws, so its labels show.
	// The headroom must count that one visible series, not the two in `series`.
	const data = [
		{ m: 'Jan', r: 40, s: 1 },
		{ m: 'Feb', r: 100, s: 2 },
		{ m: 'Mar', r: 65, s: 3 },
	]

	const peakLabelAbovePeak = (container: HTMLElement) => {
		fireEvent.click(allBySlot(container, 'chart-legend-item')[1] as HTMLElement)

		const label = allBySlot(container, 'chart-value-label').find((n) => n.textContent === '100')

		const peak = allBySlot(container, 'chart-point')[1]

		expect(Number(label?.getAttribute('y'))).toBeLessThan(Number(peak?.getAttribute('cy')))
	}

	it('reserves the room on a LineChart', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})

	it('reserves the room on an AreaChart', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})

	it('reserves the room on a ComboChart, counting only its line and area series', () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ type: 'line', xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ type: 'line', xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})
})
