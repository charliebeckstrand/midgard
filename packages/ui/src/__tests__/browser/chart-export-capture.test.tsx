import type { CSSProperties } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { type ChartCapture, prepareChartCapture } from '../../modules/chart/engine/chart-export'
import { LineChart } from '../../modules/chart/line-chart'
import { attach, getSlot, noop, present, renderUI, waitFor } from '../helpers'

/**
 * The synchronous half of an image export: the style-frozen clone of the chart,
 * and the box that the bitmap crops to. The async half decodes an image, which
 * this suite does not drive (CONVENTIONS §10.3). The crop, the pruned legend,
 * and the dropped hidden nodes are layout claims, so they run in the browser.
 */
beforeAll(() => page.viewport(960, 800))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const DATA = MONTHS.map((month, index) => ({
	month,
	revenue: 40 + index * 7,
	costs: 20 + index * 3,
}))

const SERIES = [
	{ xKey: 'month' as const, yKey: 'revenue' as const, yName: 'Revenue' },
	{ xKey: 'month' as const, yKey: 'costs' as const, yName: 'Costs' },
]

type Placement = 'top' | 'bottom' | 'left' | 'right'

/** Renders a titled two-series line chart with its legend at `legend`, and waits for the data table. */
async function renderChart(legend: Placement, dir: 'ltr' | 'rtl' = 'ltr') {
	const { container } = renderUI(
		<div dir={dir} style={{ width: 640 }}>
			<LineChart
				aria-label="Revenue and costs by month"
				title="Revenue"
				data={DATA}
				series={SERIES}
				legend={legend}
				reference={[{ value: 60, label: 'Target' }]}
				animate={false}
			/>
		</div>,
	)

	// The table lands in a deferred pass after the plot paints.
	await waitFor(() => expect(container.querySelector('[data-slot="chart-table"]')).not.toBeNull())

	await waitFor(() => expect(drawing(container).getBoundingClientRect().width).toBeGreaterThan(0))

	return getSlot(container, 'chart')
}

/** The drawing SVG of the chart under `scope`. */
function drawing(scope: ParentNode): SVGSVGElement {
	return present(scope.querySelector<SVGSVGElement>('[data-slot="chart-plot"] svg'), 'plot svg')
}

/** A rect relative to the border box of `root`. */
function relative(element: Element, root: Element) {
	const rect = element.getBoundingClientRect()

	const origin = root.getBoundingClientRect()

	return {
		left: rect.left - origin.left,
		top: rect.top - origin.top,
		right: rect.right - origin.left,
		bottom: rect.bottom - origin.top,
		width: rect.width,
		height: rect.height,
	}
}

/**
 * Lays the prepared clone out on the page for the current test, so a case can
 * read where the drawing sits in it. Production never attaches the clone. The
 * case does, to check the crop against the clone that the bitmap draws.
 */
function layOut(clone: HTMLElement): void {
	const host = attach(document.createElement('div'))

	host.style.cssText = 'position: fixed; left: 0; top: 0;'

	host.append(clone)
}

/** Runs `capture` and returns what it gives, with the mutations of the chart that it caused. */
function watched(root: HTMLElement, capture: () => ChartCapture) {
	const observer = new MutationObserver(noop)

	observer.observe(root, { attributes: true, childList: true, subtree: true })

	const result = capture()

	const mutations = observer.takeRecords()

	observer.disconnect()

	return { result, mutations }
}

describe('chart image capture (real browser)', () => {
	it('crops a right-legend chart to its plot and header, and leaves the page alone', async () => {
		const root = await renderChart('right')

		const svg = relative(drawing(root), root)

		const legend = relative(getSlot(root, 'chart-legend'), root)

		const { result, mutations } = watched(root, () => prepareChartCapture(root, false))

		// The live chart does not change: no hidden legend and no reflow.
		expect(mutations).toHaveLength(0)

		const { box } = result

		// The rail is outside the crop, and the crop is the width of the drawing.
		expect(box.x + box.width).toBeLessThanOrEqual(Math.ceil(legend.left))

		expect(Math.abs(box.width - svg.width)).toBeLessThanOrEqual(1)

		expect(Math.abs(box.x - svg.left)).toBeLessThanOrEqual(1)

		// The pruned legend keeps no entries in the clone.
		expect(result.clone.querySelector('[data-slot="chart-legend-item"]')).toBeNull()
	})

	it('moves a left-legend plot under the header, so the crop holds no rail', async () => {
		const root = await renderChart('left')

		const svg = relative(drawing(root), root)

		const { box, clone } = prepareChartCapture(root, false)

		expect(Math.abs(box.width - svg.width)).toBeLessThanOrEqual(1)

		layOut(clone)

		const moved = relative(drawing(clone), clone)

		// In the clone, the drawing sits at the left edge of the crop, where the rail was.
		expect(Math.abs(moved.left - box.x)).toBeLessThanOrEqual(1)

		expect(moved.left).toBeLessThan(svg.left - 1)
	})

	// In RTL the row of a `left` legend puts the rail on the right, the inline
	// start, where the header text also starts.
	it('moves an RTL plot toward the inline start, under the header', async () => {
		const root = await renderChart('left', 'rtl')

		const svg = relative(drawing(root), root)

		expect(relative(getSlot(root, 'chart-legend'), root).left).toBeGreaterThan(svg.right)

		const { box, clone } = prepareChartCapture(root, false)

		expect(Math.abs(box.width - svg.width)).toBeLessThanOrEqual(1)

		layOut(clone)

		const moved = relative(drawing(clone), clone)

		expect(Math.abs(moved.right - (box.x + box.width))).toBeLessThanOrEqual(1)

		expect(moved.right).toBeGreaterThan(svg.right + 1)
	})

	it('closes the band of a top legend between the header and the plot', async () => {
		const root = await renderChart('top')

		const svg = relative(drawing(root), root)

		const header = relative(getSlot(root, 'chart-header'), root)

		const { box, clone } = prepareChartCapture(root, false)

		layOut(clone)

		const moved = relative(drawing(clone), clone)

		// The crop starts at the header and ends at the bottom of the drawing, which
		// moved up by the band of the legend.
		expect(box.y).toBeGreaterThanOrEqual(Math.floor(header.top))

		expect(box.y).toBeLessThan(header.bottom)

		expect(Math.abs(box.y + box.height - moved.bottom)).toBeLessThanOrEqual(1)

		expect(moved.bottom).toBeLessThan(svg.bottom - 1)

		expect(Math.abs(box.width - svg.width)).toBeLessThanOrEqual(1)
	})

	it('ends the crop of a bottom legend at the drawing', async () => {
		const root = await renderChart('bottom')

		const svg = relative(drawing(root), root)

		const { box } = prepareChartCapture(root, false)

		expect(Math.abs(box.y + box.height - svg.bottom)).toBeLessThanOrEqual(1)

		expect(box.y + box.height).toBeLessThan(root.getBoundingClientRect().height - 1)
	})

	it('drops the hidden table, the hidden reference list, and the ghost row from the clone', async () => {
		const root = await renderChart('top')

		// The legend stays in this export, so the ghost row of a capped legend
		// is in the tree that the clone copies.
		expect(root.querySelector('[data-slot="chart-legend-ghost"]')).not.toBeNull()

		expect(root.querySelector('[data-slot="chart-reference-list"]')).not.toBeNull()

		const { clone, box } = prepareChartCapture(root, true)

		expect(clone.querySelector('table, tr, td')).toBeNull()

		expect(clone.querySelector('[data-slot="chart-reference-list"]')).toBeNull()

		expect(clone.querySelector('[data-slot="chart-legend-ghost"]')).toBeNull()

		// The legend that paints stays.
		expect(clone.querySelector('[data-slot="chart-legend-item"]')).not.toBeNull()

		// With the legend kept, the crop is the whole chart.
		const rect = root.getBoundingClientRect()

		expect(box).toEqual({
			x: 0,
			y: 0,
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		})
	})
})

describe('chart image ground (real browser)', () => {
	/** Renders a small line chart inside `surface`, and returns its root. */
	async function chartOn(surface: CSSProperties, inner?: CSSProperties) {
		const { container } = renderUI(
			<div style={{ width: 480, ...surface }}>
				<div style={inner}>
					<LineChart
						aria-label="Revenue by month"
						data={DATA}
						series={SERIES.slice(0, 1)}
						animate={false}
					/>
				</div>
			</div>,
		)

		await waitFor(() => expect(drawing(container).getBoundingClientRect().width).toBeGreaterThan(0))

		return getSlot(container, 'chart')
	}

	it('grounds the bitmap on the surface under the chart', async () => {
		// A dark surface. Before, a JPEG always drew on white, where the light
		// text of a dark theme could not be read.
		const root = await chartOn({ background: 'rgb(9, 9, 11)' })

		expect(prepareChartCapture(root, true).ground).toEqual(['rgb(9, 9, 11)'])
	})

	it('layers a translucent surface over the one beneath it, outermost first', async () => {
		const root = await chartOn(
			{ background: 'rgb(9, 9, 11)' },
			{ background: 'rgba(255, 255, 255, 0.1)' },
		)

		expect(prepareChartCapture(root, true).ground).toEqual([
			'rgb(9, 9, 11)',
			'rgba(255, 255, 255, 0.1)',
		])
	})
})
