import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart/heatmap-chart'
import { getSlot, renderUI, waitFor } from '../helpers'

/**
 * The heatmap frame settles in a real layout.
 *
 * A side rail narrows the plot, and the default aspect then shortens it. The
 * spark tier and the rail read the height of that plot, so a wide grid could
 * drop under the spark floor, hide the rail, grow back, and show it again, with
 * no end. A free-form frame (`aspectRatio={false}`) must take the height of its
 * box. Rides the real browser because both claims are layout.
 */
type Cell = { row: string; col: string; value: number }

function grid(rows: number, cols: number): Cell[] {
	return Array.from({ length: rows }, (_, row) =>
		Array.from({ length: cols }, (_, col) => ({
			row: `R${row}`,
			col: `C${col}`,
			value: row * cols + col,
		})),
	).flat()
}

const SERIES: [HeatmapChartSeries<Cell>] = [
	{ xKey: 'col', yKey: 'row', colorKey: 'value', colorRange: ['#e0f2fe', '#0369a1'] },
]

/** Waits for two frames, so a layout effect loop has the time to run. */
async function settle() {
	for (let frame = 0; frame < 2; frame++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

describe('heatmap frame (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	it('settles a wide grid whose rail would push the plot under the spark floor', async () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

		onTestFinished(() => errors.mockRestore())

		// The loop sits where the grid is just tall enough without the rail, and
		// too short beside it: a narrow band of widths above the side-rail floor.
		for (let width = 384; width <= 420; width += 4) {
			const { container, unmount } = renderUI(
				<div style={{ width }}>
					<HeatmapChart aria-label="Wide grid" data={grid(7, 24)} series={SERIES} />
				</div>,
			)

			await waitFor(() =>
				expect(getSlot(container, 'heatmap-plot').querySelector('svg')).not.toBeNull(),
			)

			await settle()

			unmount()
		}

		const loops = errors.mock.calls.filter((call) =>
			String(call[0]).includes('Maximum update depth'),
		)

		expect(loops).toHaveLength(0)
	})

	it('takes the height of its box with the aspect ratio off', async () => {
		const { container } = renderUI(
			<div style={{ width: 600, height: 320 }}>
				<HeatmapChart
					aria-label="Filled grid"
					data={grid(4, 6)}
					series={SERIES}
					aspectRatio={false}
				/>
			</div>,
		)

		await waitFor(() => {
			const svg = getSlot(container, 'heatmap-plot').querySelector('svg')

			expect(Number(svg?.getAttribute('height') ?? 0)).toBeGreaterThan(200)
		})
	})
})
