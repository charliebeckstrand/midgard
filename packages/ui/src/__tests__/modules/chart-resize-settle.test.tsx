import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, bySlot, mockDomGeometry, renderUI } from '../helpers'

/**
 * Charts pass `RESIZE_SETTLE_MS` to `usePlotFrame`, so a resize burst rebuilds
 * their scales and mark geometry once — after the size settles — rather than on
 * every `ResizeObserver` frame. The plot's `viewBox` carries the committed
 * frame width, so it is the faithful signal for "the frame re-rendered": it
 * holds through the burst (the SVG scaling through it meanwhile) and moves once
 * the quiet window elapses.
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

describe('chart resize settle', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		vi.useFakeTimers()

		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()

		vi.useRealTimers()
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

	it('coalesces a cartesian chart resize burst into one commit', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Values by quarter"
				data={DATA}
				series={[{ xKey: 'x', yKey: 'y', yName: 'Value' }]}
				aspectRatio={2}
			/>,
		)

		// The first real width paints at once — a frame revealed after mount must
		// not hold its first paint through the settle window.
		resizeTo(container, 300)

		expect(frameWidth(container)).toBe('300')

		// A resize burst: the committed frame holds while notifications arrive.
		resizeTo(container, 320)

		resizeTo(container, 360)

		expect(frameWidth(container)).toBe('300')

		// The quiet window elapses: one commit, at the final size.
		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(frameWidth(container)).toBe('360')
	})

	it('coalesces a pie chart resize burst into one commit', () => {
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

		resizeTo(container, 360)

		expect(frameWidth(container)).toBe('300')

		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(frameWidth(container)).toBe('360')
	})
})
