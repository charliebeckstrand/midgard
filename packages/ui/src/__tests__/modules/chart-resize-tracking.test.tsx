import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, bySlot, mockDomGeometry, renderUI } from '../helpers'

/**
 * Charts track their container live: every resize notification the frame
 * measures commits through a transition, so the drawn geometry follows the
 * box with no settle window and no timers — the final size lands the moment
 * its notification does. The plot's `viewBox` carries the committed frame
 * width, so it is the faithful signal for what the marks were built against.
 */

type StubInstance = {
	callback: ResizeObserverCallback
}

/** Captures constructed `ResizeObserver`s so a test can fire their callbacks. */
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
	{ x: 'Q1', y: 40 },
	{ x: 'Q2', y: 80 },
	{ x: 'Q3', y: 65 },
]

describe('chart resize tracking', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	/** Reports a container width to the chart through its captured observer. */
	function resizeTo(container: HTMLElement, width: number) {
		const plot = bySlot(container, 'chart-plot')

		if (!plot) throw new Error('no chart-plot region rendered')

		mockDomGeometry(plot, { clientWidth: width, clientHeight: 0 })

		act(() => {
			for (const observer of stub.instances) {
				observer.callback([], observer as unknown as ResizeObserver)
			}
		})
	}

	/** The width component of the plot SVG's `viewBox`, or `undefined` before first paint. */
	function frameWidth(container: HTMLElement): string | undefined {
		return bySlot(container, 'chart-plot')
			?.querySelector('svg')
			?.getAttribute('viewBox')
			?.split(' ')[2]
	}

	it('tracks a cartesian chart resize burst live, landing the final width without timers', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Values by quarter"
				data={DATA}
				series={[{ xKey: 'x', yKey: 'y', yName: 'Value' }]}
				aspectRatio={2}
			/>,
		)

		// The first real width paints at once.
		resizeTo(container, 300)

		expect(frameWidth(container)).toBe('300')

		// Each notification commits: the geometry follows the container with no
		// quiet window holding it at a stale size.
		resizeTo(container, 320)

		expect(frameWidth(container)).toBe('320')

		resizeTo(container, 360)

		expect(frameWidth(container)).toBe('360')
	})

	it('tracks a pie chart resize burst live, landing the final width without timers', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Share by quarter"
				data={DATA}
				series={[{ xKey: 'x', yKey: 'y' }]}
				aspectRatio={2}
			/>,
		)

		resizeTo(container, 300)

		expect(frameWidth(container)).toBe('300')

		resizeTo(container, 320)

		expect(frameWidth(container)).toBe('320')

		resizeTo(container, 360)

		expect(frameWidth(container)).toBe('360')
	})

	it('holds the committed frame through a notification that changes nothing', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Values by quarter"
				data={DATA}
				series={[{ xKey: 'x', yKey: 'y', yName: 'Value' }]}
				aspectRatio={2}
			/>,
		)

		resizeTo(container, 300)

		const svg = bySlot(container, 'chart-plot')?.querySelector('svg')

		// Same width again: the equality guard swallows the notification, so the
		// SVG is not even re-rendered — the element identity holds.
		resizeTo(container, 300)

		expect(frameWidth(container)).toBe('300')

		expect(bySlot(container, 'chart-plot')?.querySelector('svg')).toBe(svg)
	})
})
