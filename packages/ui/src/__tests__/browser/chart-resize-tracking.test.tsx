import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { BarChart } from '../../modules/chart/bar-chart'
import { renderUI, waitFor } from '../helpers'

/**
 * Resize tracking under a real engine: a genuine `ResizeObserver` fires as the
 * host box changes, the chart's aspect-reserved plot box follows through CSS,
 * and the frame's transition commits land the final geometry — no settle
 * window, no timers. The tab-hosted case is the docs-page shape that used to
 * cascade: the panel's height is coupled to its width through the chart's
 * aspect box, so every drag frame resizes the panel too — and the fading
 * surface must sit that out at `height: auto`, never pinning to a stale pixel
 * height (a pin here is the height-tracker regression).
 */

const DATA = [
	{ x: 'Q1', y: 40 },
	{ x: 'Q2', y: 80 },
	{ x: 'Q3', y: 65 },
]

function chart() {
	return (
		<BarChart
			aria-label="Values by quarter"
			data={DATA}
			series={[{ xKey: 'x', yKey: 'y', yName: 'Value' }]}
			aspectRatio={2}
		/>
	)
}

/** The committed frame width — the width component of the plot SVG's viewBox. */
function frameWidth(container: HTMLElement): string | undefined {
	return container
		.querySelector('[data-slot="chart-plot"] svg')
		?.getAttribute('viewBox')
		?.split(' ')[2]
}

/** Two frames: one for the observer delivery, one for the commit to paint. */
function frames() {
	return new Promise((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(resolve))
	})
}

describe('chart resize tracking (real browser)', () => {
	it('follows a container resize burst to the final width with no settle wait', async () => {
		const { container } = renderUI(
			<div data-testid="host" style={{ width: 600 }}>
				{chart()}
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		if (!host) throw new Error('no host rendered')

		await waitFor(() => expect(frameWidth(container)).toBe('600'))

		for (const width of [640, 680, 720]) {
			host.style.width = `${width}px`

			await frames()
		}

		await waitFor(() => expect(frameWidth(container)).toBe('720'))
	})

	it('resizes a chart inside the fading tab surface without pinning the panel height', async () => {
		const { container } = renderUI(
			<div data-testid="host" style={{ width: 600 }}>
				<Tabs defaultValue="bar">
					<TabList aria-label="Chart kind">
						<Tab value="bar">Bar</Tab>
					</TabList>

					<TabContents>
						<TabContent value="bar">{chart()}</TabContent>
					</TabContents>
				</Tabs>
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		const contents = container.querySelector<HTMLElement>('[data-slot="tab-contents"]')

		if (!host || !contents) throw new Error('host or tab surface missing')

		await waitFor(() => expect(frameWidth(container)).toBe('600'))

		// The drag: every frame moves the panel's width and — through the chart's
		// aspect box — its height. The chart tracks; the surface stays on auto.
		for (const width of [640, 680, 720]) {
			host.style.width = `${width}px`

			await frames()

			expect(contents.style.height.endsWith('px')).toBe(false)
		}

		await waitFor(() => expect(frameWidth(container)).toBe('720'))

		expect(contents.style.height.endsWith('px')).toBe(false)
	})
})
