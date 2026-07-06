import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, bySlot, mockDomGeometry, renderUI } from '../helpers'

/**
 * A chart's `aspectRatio` folds a stacked (top / bottom) legend into the whole
 * chart, so a legended chart in a fixed-aspect tile fills it without the band
 * overflowing: the figure wrapper carries the CSS aspect-ratio, the band takes
 * its natural height, and the plot fills what it leaves — its drawing height
 * derived from that remainder, measured once the box is laid out and falling
 * back to the full ratio height before then, so the frame never collapses. A
 * side (left / right) legend instead keeps the ratio on the plot box and bands
 * beside it, so the drawing holds the ratio regardless of the panel's width.
 */

type StubInstance = { callback: ResizeObserverCallback }

/** Captures constructed `ResizeObserver`s so a test can fire their callbacks by hand. */
function installResizeObserverStub() {
	const original = window.ResizeObserver

	const instances: StubInstance[] = []

	class Stub {
		observe = vi.fn()
		unobserve = vi.fn()
		disconnect = vi.fn()

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}
	}

	window.ResizeObserver = Stub as unknown as typeof ResizeObserver

	return {
		instances,
		restore: () => {
			window.ResizeObserver = original
		},
	}
}

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
] as const

function legended(extra?: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return <BarChart aria-label="Revenue by quarter" data={DATA} series={[...SERIES]} {...extra} />
}

/** The height component of the plot SVG's `viewBox`, or `undefined` before first paint. */
function frameHeight(container: HTMLElement): string | undefined {
	return bySlot(container, 'chart-plot')
		?.querySelector('svg')
		?.getAttribute('viewBox')
		?.split(' ')[3]
}

describe('chart aspect ratio with a legend', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	/** Reports a plot box of the given size to the chart through its captured observer. */
	function measurePlot(container: HTMLElement, box: { width: number; height: number }) {
		const plot = bySlot(container, 'chart-plot')

		if (!plot) throw new Error('no chart-plot region rendered')

		mockDomGeometry(plot, { clientWidth: box.width, clientHeight: box.height })

		act(() => {
			for (const observer of stub.instances) {
				observer.callback([], observer as unknown as ResizeObserver)
			}
		})
	}

	it('carries the ratio on the figure and fills the plot into the remainder', () => {
		const { container } = renderUI(legended({ aspectRatio: '16/9' }))

		// The whole chart holds the ratio; the plot box no longer reserves its own.
		const figure = bySlot(container, 'chart-figure') as HTMLElement

		expect(figure.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')

		expect(bySlot(container, 'aspect-ratio')).toBeNull()

		// The plot grows into the space the legend leaves rather than reserving a box.
		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot.className).toContain('flex-1')

		expect(plot.className).toContain('min-h-0')

		expect((plot.firstElementChild as HTMLElement).className).toContain('size-full')
	})

	it("derives the plot's drawing height from the measured remainder, not the full ratio", () => {
		const { container } = renderUI(legended({ aspectRatio: '16/9' }))

		// A 480-wide plot at 16/9 would be 270 tall; the legend leaves it 220, so the
		// drawing height must follow the measured remainder — not the ratio's 270.
		measurePlot(container, { width: 480, height: 220 })

		expect(frameHeight(container)).toBe('220')
	})

	it('falls back to the full ratio height before the remainder is measured', () => {
		// An explicit width with no measurement (the SSR / test path): the plot draws
		// at the full ratio height rather than collapsing to zero.
		const { container } = renderUI(legended({ aspectRatio: '16/9', width: 320 }))

		expect(frameHeight(container)).toBe('180')
	})

	it('folds a stacked legend into the figure ratio but bands a side legend beside the plot', () => {
		for (const placement of ['top', 'bottom', 'left', 'right'] as const) {
			const { container } = renderUI(legended({ aspectRatio: '16/9', legend: placement }))

			const figure = bySlot(container, 'chart-figure') as HTMLElement

			// A side legend lays plot and legend in a row once the container has room
			// (`@xl`); top / bottom stack.
			const aside = placement === 'left' || placement === 'right'

			expect(figure.className.includes('@xl:flex-row')).toBe(aside)

			if (aside) {
				// The plot box holds the ratio itself and the figure reserves none, so the
				// drawing keeps 16:9 with the panel beside it rather than squeezing to fit.
				expect(figure.style.aspectRatio).toBe('')

				const box = bySlot(container, 'aspect-ratio') as HTMLElement

				expect(box.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')
			} else {
				// A stacked legend folds into the figure's aspect box; the plot fills what
				// its short band leaves rather than reserving its own ratio.
				expect(figure.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')

				expect(bySlot(container, 'aspect-ratio')).toBeNull()
			}

			expect(bySlot(container, 'chart-legend')).not.toBeNull()
		}
	})

	it('draws a side-legend plot at the ratio of its own width, not a legend-squeezed remainder', () => {
		const { container } = renderUI(legended({ aspectRatio: '16/9', legend: 'right' }))

		// The plot measures its own width — the flex-1 remainder beside the panel —
		// and reserves 16:9 from it, so the drawing height ignores the reported height
		// and follows the ratio: 320 wide → 180 tall, never the squeezed remainder.
		measurePlot(container, { width: 320, height: 500 })

		expect(frameHeight(container)).toBe('180')
	})

	it('fills the plot into a definite-height container under aspectRatio={false}', () => {
		// Free-form fill: no ratio figure, the plot a flex-1 child that grows into the
		// container's height rather than collapsing to zero.
		const { container } = renderUI(legended({ aspectRatio: false }))

		const chart = bySlot(container, 'chart') as HTMLElement

		expect(chart.className).toContain('h-full')

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot.className).toContain('flex-1')

		expect(plot.className).toContain('min-h-0')

		// The container's measured height becomes the drawing height.
		const fill = installFill(container, stub)

		expect(fill).toBe('264')
	})

	it('shares the ratio between a pie and its legend, filling the pie into the remainder', () => {
		const pie = renderUI(
			<PieChart
				aria-label="Share by quarter"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
				aspectRatio={1}
			/>,
		)

		const figure = bySlot(pie.container, 'chart-figure') as HTMLElement

		// Three slices show a legend, so the square describes the whole chart.
		expect(figure.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1')

		const plot = bySlot(pie.container, 'chart-plot') as HTMLElement

		expect(plot.className).toContain('flex-1')

		expect((plot.firstElementChild as HTMLElement).className).toContain('size-full')
	})
})

/** Measures a fill-mode container and returns its resolved drawing height. */
function installFill(container: HTMLElement, stub: ReturnType<typeof installResizeObserverStub>) {
	const plot = bySlot(container, 'chart-plot')

	if (!plot) throw new Error('no chart-plot region rendered')

	mockDomGeometry(plot, { clientWidth: 470, clientHeight: 264 })

	act(() => {
		for (const observer of stub.instances) {
			observer.callback([], observer as unknown as ResizeObserver)
		}
	})

	return plot.querySelector('svg')?.getAttribute('viewBox')?.split(' ')[3]
}
