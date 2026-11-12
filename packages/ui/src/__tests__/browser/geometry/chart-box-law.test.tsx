import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../../modules/chart/bar-chart'
import { PieChart } from '../../../modules/chart/pie-chart'
import { SeatChart } from '../../../modules/chart/seat-chart'
import { allBySlot, bySlot, getSlot, renderUI, waitFor } from '../../helpers'

/**
 * The box-law in a real browser: a chart's aspect ratio is a preference a
 * definite-height parent clamps, not a height the drawing forces on the box. A
 * 16:9 chart in a 16:9 tile that spends height on a header is the exact overflow
 * case (the chart's own ratio would run taller than the header leaves) so the
 * chart must fill what is left rather than spilling past the tile. Only computed
 * layout resolves this, so it lives here rather than in jsdom.
 */
describe('chart box-law (real browser)', () => {
	beforeAll(() => page.viewport(1200, 800))

	const DATA = [
		{ month: 'Jan', revenue: 42 },
		{ month: 'Feb', revenue: 58 },
		{ month: 'Mar', revenue: 47 },
		{ month: 'Apr', revenue: 63 },
	]

	const bars = (className?: string) => (
		<BarChart
			aria-label="Revenue by month"
			data={DATA}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			aspectRatio={16 / 9}
			className={className}
		/>
	)

	const svgHeight = (container: HTMLElement) =>
		bySlot(container, 'chart-plot')?.querySelector('svg')?.getBoundingClientRect().height ?? 0

	it('clamps a ratio chart to a definite-height tile instead of overflowing it', async () => {
		// A 360-wide 16:9 tile (~202px tall) with a ~40px header, holding a 16:9
		// chart: the chart's own ratio wants ~202px but only ~162px remain. The chart
		// is a flex-1 child so the column constrains its height.
		const { container } = renderUI(
			<div
				style={{
					width: 360,
					aspectRatio: '16 / 9',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<div style={{ height: 40, flex: 'none' }}>Revenue by month</div>

				{bars('min-h-0 flex-1')}
			</div>,
		)

		const tile = container.firstElementChild as HTMLElement
		const figure = getSlot(container, 'chart-figure')

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		const tileRect = tile.getBoundingClientRect()
		const figureRect = figure.getBoundingClientRect()

		// The figure fits inside the tile: its bottom never crosses the tile's.
		expect(figureRect.bottom).toBeLessThanOrEqual(tileRect.bottom + 0.6)

		// It fills most of the ~162px the header leaves rather than forcing its
		// unclamped 16:9 height (~202px, which would spill past the tile).
		expect(figureRect.height).toBeGreaterThan(130)

		expect(figureRect.height).toBeLessThan(tileRect.height - 30)

		// The plot drew at that clamped height with real marks, not a squished sliver.
		expect(svgHeight(container)).toBeGreaterThan(130)

		expect(allBySlot(container, 'chart-bar').length).toBeGreaterThan(0)
	})

	it('takes its full ratio height when nothing clamps it', async () => {
		// The same chart in an unconstrained block parent: no definite height to
		// clamp against, so the ratio governs and the figure stands at width / ratio.
		const { container } = renderUI(<div style={{ width: 360 }}>{bars()}</div>)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		const figure = getSlot(container, 'chart-figure')

		// 360 / (16 / 9) ≈ 202, the ratio's own height, not a clamped remainder.
		expect(figure.getBoundingClientRect().height).toBeGreaterThan(190)
	})

	const SLICES = [
		{ quarter: 'Q1', sales: 40 },
		{ quarter: 'Q2', sales: 80 },
		{ quarter: 'Q3', sales: 65 },
	]

	const pie = (data = SLICES, legend?: false) => (
		<PieChart
			aria-label="Sales by quarter"
			className="h-full"
			data={data}
			series={[{ xKey: 'quarter', yKey: 'sales' }]}
			aspectRatio={1}
			legend={legend}
		/>
	)

	/** How far the drawing runs past the bottom of the host, in px. */
	const overflow = (container: HTMLElement) => {
		const host = container.firstElementChild as HTMLElement

		const svg = bySlot(container, 'chart-plot')?.querySelector('svg')

		return (svg?.getBoundingClientRect().bottom ?? 0) - host.getBoundingClientRect().bottom
	}

	it('clamps a pie with no legend to a definite-height host', async () => {
		// A 1:1 pie in a 400 x 200 host wants 400 px of height. With no legend it
		// must clamp to the host, as a bar chart and a pie with a legend do.
		const { container } = renderUI(
			<div style={{ width: 400, height: 200 }}>{pie(SLICES, false)}</div>,
		)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		expect(overflow(container)).toBeLessThanOrEqual(0.6)
	})

	it('clamps a pie whose one slice hides the legend', async () => {
		const { container } = renderUI(
			<div style={{ width: 400, height: 200 }}>{pie(SLICES.slice(0, 1))}</div>,
		)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		expect(overflow(container)).toBeLessThanOrEqual(0.6)
	})

	it('clamps a seat chart with no legend to a definite-height host', async () => {
		const { container } = renderUI(
			<div style={{ width: 400, height: 150, display: 'flex', flexDirection: 'column' }}>
				<SeatChart
					aria-label="Seats"
					className="h-full"
					groups={[
						{ seats: 50, color: 'blue', label: 'A' },
						{ seats: 50, color: 'red', label: 'B' },
					]}
					legend={false}
				/>
			</div>,
		)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		expect(overflow(container)).toBeLessThanOrEqual(0.6)
	})

	it('gives a pie with no legend its full ratio height when nothing clamps it', async () => {
		const { container } = renderUI(<div style={{ width: 400 }}>{pie(SLICES, false)}</div>)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		// 400 / 1, the ratio's own height.
		expect(svgHeight(container)).toBeGreaterThan(390)
	})

	it('keeps the title of a pie with no legend inside its ratio box', async () => {
		// The figure carries the ratio, as it does with a stacked legend and for a
		// cartesian chart: the figure is 400 px tall, and the pie takes the height
		// that the title leaves.
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<PieChart
					aria-label="Sales by quarter"
					title="Sales by quarter"
					data={SLICES}
					series={[{ xKey: 'quarter', yKey: 'sales' }]}
					aspectRatio={1}
					legend={false}
				/>
			</div>,
		)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		const figure = getSlot(container, 'chart-figure').getBoundingClientRect().height

		expect(figure).toBeGreaterThan(398)
		expect(figure).toBeLessThan(402)
		expect(svgHeight(container)).toBeLessThan(figure - 16)
	})
})
