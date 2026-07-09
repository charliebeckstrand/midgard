import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { BarChart } from '../../modules/chart/bar-chart'
import { HeatmapChart } from '../../modules/chart/heatmap-chart'
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

/** The plot SVG, whichever chart mode reserved its box. */
function plotSvg(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector<SVGSVGElement>('[data-slot="chart-plot"] svg')

	if (!svg) throw new Error('no plot svg')

	return svg
}

/** The committed frame width — the width component of the plot SVG's viewBox. */
function frameWidth(container: HTMLElement): string | undefined {
	return plotSvg(container).getAttribute('viewBox')?.split(' ')[2]
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

	it('holds committed geometry through the resize, not scaling to the new box', async () => {
		const { container } = renderUI(
			<div data-testid="host" style={{ width: 600 }}>
				{chart()}
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		if (!host) throw new Error('no host rendered')

		await waitFor(() => expect(frameWidth(container)).toBe('600'))

		// Grow the box and read the SVG synchronously — before the observer's
		// transition commit can land. The drawing renders at its committed pixel
		// size (its viewBox), not the box's new CSS width, so the geometry never
		// scales mid-drag. A `size-full` SVG would report the new box width here
		// while its viewBox still read 600 — the stale-viewBox smear this pins out.
		host.style.width = '900px'

		const svg = plotSvg(container)

		const rendered = Math.round(svg.getBoundingClientRect().width)

		const committed = Number(svg.getAttribute('viewBox')?.split(' ')[2])

		expect(committed).toBe(600)

		expect(rendered).toBe(committed)

		// The commit still lands the new size — the box is clipping a growing edge
		// sliver for a frame, not holding a stale geometry forever.
		await waitFor(() => expect(frameWidth(container)).toBe('900'))

		expect(Math.round(plotSvg(container).getBoundingClientRect().width)).toBe(900)
	})

	it('settles a fill-mode chart at the spark floor even with a wrapping legend', async () => {
		// A free-form fill chart (`aspectRatio={false}`) shares its container box with
		// the header and legend, so the `flex-1` plot's height is the container's less
		// that chrome. Feed that measured remainder to the tier and it loops at the
		// spark floor: spark drops the chrome, the remainder jumps back above the
		// floor, the tier flips to compact, the chrome returns, the remainder drops —
		// a synchronous re-measure with no fixed point, which React aborts with
		// "Maximum update depth exceeded". The tier reads the chrome-independent
		// container box instead, so it settles. Many series force the bottom legend to
		// WRAP — the case a fixed one-row chrome estimate got wrong (it reappeared as
		// the same loop), which measuring the container rather than estimating fixes.
		const series = Array.from({ length: 8 }, (_, i) => ({
			xKey: 'x' as const,
			yKey: 'y' as const,
			yName: `Series number ${i + 1}`,
		}))

		const { container } = renderUI(
			<div data-testid="host" style={{ width: 300, height: 160 }}>
				<BarChart
					aria-label="Values by quarter"
					title="Quarterly values"
					data={DATA}
					series={series}
					aspectRatio={false}
				/>
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		if (!host) throw new Error('no host rendered')

		const tier = () => {
			const el = container.querySelector<HTMLElement>('[data-slot="chart"]')

			if (!el) throw new Error('no chart root')

			return el.getAttribute('data-tier')
		}

		await waitFor(() => expect(tier()).not.toBeNull())

		// Sweep container heights through the region where the plot remainder crosses
		// the 96px spark floor; at every step the tier must be the same across two
		// frames — a loop would flicker the tier between reads, or throw "Maximum
		// update depth exceeded" mid-sweep before we ever get to compare.
		for (let height = 100; height <= 220; height += 4) {
			host.style.height = `${height}px`

			await frames()

			const settled = tier()

			await frames()

			expect(tier()).toBe(settled)
		}
	})

	it('keeps tracking a heatmap resize across a legend placement flip', async () => {
		// The heatmap's range bar drops from a side rail to a bottom band as the
		// measured width crosses the compact boundary — a runtime re-arrangement of
		// the figure tree. The figure keys its children so the flip *moves* the plot
		// node; a positional recreate would strand the plot frame's ResizeObserver
		// on the detached node and freeze the drawing at its last committed size
		// while the box resizes on — the defect this pins out.
		const GRID = ['a', 'b', 'c', 'd'].flatMap((col, ci) =>
			['x', 'y', 'z'].map((row, ri) => ({ col, row, value: ci + ri })),
		)

		const { container } = renderUI(
			<div data-testid="host" style={{ width: 600 }}>
				<HeatmapChart
					aria-label="Values by row and column"
					data={GRID}
					series={[{ xKey: 'col', yKey: 'row', colorKey: 'value', colorRange: ['#eee', '#111'] }]}
				/>
			</div>,
		)

		const host = container.querySelector<HTMLElement>('[data-testid="host"]')

		if (!host) throw new Error('no host rendered')

		/** The committed drawing size tracks the plot box — width and height alike. */
		const tracks = () => {
			const svg = container.querySelector<SVGSVGElement>('[data-slot="heatmap-plot"] svg')

			if (!svg?.parentElement) throw new Error('no heatmap svg')

			const box = svg.parentElement.getBoundingClientRect()

			expect(Number(svg.getAttribute('width'))).toBe(Math.round(box.width))

			expect(Number(svg.getAttribute('height'))).toBe(Math.round(box.height))
		}

		/** Whether the range bar sits beside the plot (aside) or banded below it. */
		const asideNow = () => {
			const plot = container.querySelector('[data-slot="heatmap-plot"]')

			const legend = container.querySelector('[data-slot="heatmap-legend-box"]')

			if (!plot || !legend) throw new Error('plot or legend missing')

			return legend.getBoundingClientRect().left >= plot.getBoundingClientRect().right - 1
		}

		await waitFor(() => tracks())

		expect(asideNow()).toBe(true)

		// Cross the compact boundary: the rail drops to a bottom band, re-arranging
		// the figure — then every later resize must still commit.
		host.style.width = '360px'

		await waitFor(() => expect(asideNow()).toBe(false))

		await waitFor(() => tracks())

		host.style.width = '200px'

		await waitFor(() => tracks())

		// And back across: the rail returns beside the plot, still tracking.
		host.style.width = '600px'

		await waitFor(() => expect(asideNow()).toBe(true))

		await waitFor(() => tracks())
	})
})
