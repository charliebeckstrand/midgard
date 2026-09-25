import { beforeEach, describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { act, bySlot, mockDomGeometry, renderUI } from '../helpers'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * The frame's equality guard, which is a mechanism rather than a measurement.
 *
 * Charts commit every resize notification their frame measures, and that the
 * drawn geometry follows a real box is asserted against a real engine in
 * `browser/chart-resize-tracking.test.tsx` — where the host genuinely resizes.
 * This case is the one a browser cannot stage: a notification reporting a size
 * the frame already holds. A real `ResizeObserver` does not fire for a box that
 * did not change, so the redundant notification has to be synthesized, and the
 * stub is the subject here rather than a stand-in for layout.
 */

const DATA = [
	{ x: 'Q1', y: 40 },
	{ x: 'Q2', y: 80 },
	{ x: 'Q3', y: 65 },
]

describe('chart frame equality guard', () => {
	let observers: ResizeObserverStub[]

	beforeEach(() => {
		observers = stubResizeObserver()
	})

	/** Reports a container width to the chart through its captured observer. */
	function resizeTo(container: HTMLElement, width: number) {
		const plot = bySlot(container, 'chart-plot')

		if (!plot) throw new Error('no chart-plot region rendered')

		mockDomGeometry(plot, { clientWidth: width, clientHeight: 0 })

		act(() => {
			for (const observer of observers) {
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
