import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { renderUI } from '../helpers'

/**
 * Mount settling under a real engine: a container-measured chart resolves its
 * drawing size from the plot box it measures, but the width-0 first render
 * carries no chrome (spark), so its height measurement is chrome-free and too
 * tall — and when the measured tier mounts the header and legend, the plot
 * reflows shorter. `usePlotFrame` drives that measure → reflow → re-measure
 * chain to a fixed point in a layout effect, before the first paint, so the
 * marks never flash a coordinate space the box is about to abandon. This samples
 * the SVG's viewBox height against its box across the first frames and fails on
 * any squish — the mount flicker.
 */

const DATA = [
	{ month: 'Jan', revenue: 42, costs: 28 },
	{ month: 'Feb', revenue: 51, costs: 30 },
	{ month: 'Mar', revenue: 47, costs: 33 },
]

/** Two frames: one for an observer delivery, one for a commit to paint. */
function frames() {
	return new Promise((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(resolve))
	})
}

/** The SVG's viewBox height and the plot box height — a squish frame has them disagree. */
function sample(container: HTMLElement): { viewBoxHeight: number; boxHeight: number } {
	const svg = container.querySelector('[data-slot="chart-plot"] svg')

	const viewBoxHeight = Number(svg?.getAttribute('viewBox')?.split(' ')[3] ?? 0)

	const boxHeight =
		container.querySelector<HTMLElement>('[data-slot="chart-plot"]')?.clientHeight ?? 0

	return { viewBoxHeight, boxHeight }
}

describe.each([600, 300, 140])('chart mount settling at %ipx (real browser)', (width) => {
	it('paints the marks at the box height from the first frame, never a squished one', async () => {
		const { container } = renderUI(
			<div style={{ width }}>
				<BarChart
					aria-label="Revenue and costs by month"
					title="Revenue & costs"
					subtitle="Last six months"
					data={DATA}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
				/>
			</div>,
		)

		const squishes: string[] = []

		for (let i = 0; i < 8; i++) {
			await frames()

			const { viewBoxHeight, boxHeight } = sample(container)

			// Once the SVG has painted, its viewBox height must match the box it fills;
			// a mismatch past rounding is the mount squish, the marks drawn at a height
			// the box already abandoned.
			if (viewBoxHeight > 0 && Math.abs(viewBoxHeight - boxHeight) > 2) {
				squishes.push(`frame ${i}: viewBox=${viewBoxHeight} box=${boxHeight}`)
			}
		}

		expect(squishes, squishes.join('; ')).toHaveLength(0)
	})
})
