import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'

/**
 * The box-law in a real browser: a chart's aspect ratio is a preference a
 * definite-height parent clamps, not a height the drawing forces on the box. A
 * 16:9 chart in a 16:9 tile that spends height on a header is the exact overflow
 * case — the chart's own ratio would run taller than the header leaves — so the
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
		const figure = bySlot(container, 'chart-figure') as HTMLElement

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		const tileRect = tile.getBoundingClientRect()
		const figureRect = figure.getBoundingClientRect()

		// The figure fits inside the tile — its bottom never crosses the tile's.
		expect(figureRect.bottom).toBeLessThanOrEqual(tileRect.bottom + 0.6)

		// It fills most of the ~162px the header leaves rather than forcing its
		// unclamped 16:9 height (~202px, which would spill past the tile).
		expect(figureRect.height).toBeGreaterThan(130)

		expect(figureRect.height).toBeLessThan(tileRect.height - 30)

		// The plot drew at that clamped height with real marks — not a squished sliver.
		expect(svgHeight(container)).toBeGreaterThan(130)

		expect(allBySlot(container, 'chart-bar').length).toBeGreaterThan(0)
	})

	it('takes its full ratio height when nothing clamps it', async () => {
		// The same chart in an unconstrained block parent: no definite height to
		// clamp against, so the ratio governs and the figure stands at width / ratio.
		const { container } = renderUI(<div style={{ width: 360 }}>{bars()}</div>)

		await waitFor(() => expect(svgHeight(container)).toBeGreaterThan(0))

		const figure = bySlot(container, 'chart-figure') as HTMLElement

		// 360 / (16 / 9) ≈ 202, the ratio's own height, not a clamped remainder.
		expect(figure.getBoundingClientRect().height).toBeGreaterThan(190)
	})
})
