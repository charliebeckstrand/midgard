import { describe, expect, it } from 'vitest'
import { prepareChartCapture } from '../../modules/chart/engine/chart-export'
import { attach } from '../helpers'

/** Gives `element` a fixed border box, since jsdom measures each box as empty. */
function sized(element: Element, left: number, top: number, width: number, height: number) {
	const rect = DOMRect.fromRect({ x: left, y: top, width, height })

	Object.defineProperty(element, 'getBoundingClientRect', { value: () => rect })
}

/** A chart root of 320 × 200 with a legend, and a plot that holds `drawing` when set. */
function chart(drawing?: { width: number; height: number; left?: number }): HTMLElement {
	const root = document.createElement('div')

	root.innerHTML =
		'<div data-slot="chart-legend"><span>Revenue</span></div>' +
		`<div data-slot="chart-plot">${drawing ? '<svg></svg>' : ''}</div>`

	attach(root)

	sized(root, 0, 0, 320, 200)

	const svg = root.querySelector('svg')

	if (svg && drawing) sized(svg, drawing.left ?? 20, 30, drawing.width, drawing.height)

	return root
}

/**
 * An export without the legend crops to the drawing. The browser suite
 * measures a real chart. These cases hold the fallback, where no drawing gives
 * a box, so the capture keeps the whole root.
 */
describe('prepareChartCapture crop without the legend', () => {
	it('crops to the drawing that the plot holds', () => {
		expect(prepareChartCapture(chart({ width: 100, height: 50 }), false).box).toEqual({
			x: 20,
			y: 30,
			width: 100,
			height: 50,
		})
	})

	it('keeps the full root when the drawing has no size', () => {
		const capture = prepareChartCapture(chart({ width: 0, height: 50 }), false)

		expect(capture.box).toEqual({ x: 0, y: 0, width: 320, height: 200 })

		// The legend stays as an empty, hidden box, so the clone keeps its layout.
		const legend = capture.clone.querySelector<HTMLElement>('[data-slot="chart-legend"]')

		expect(legend?.childElementCount).toBe(0)

		expect(legend?.style.visibility).toBe('hidden')
	})

	it('keeps the full root when the drawing lies outside it', () => {
		const capture = prepareChartCapture(chart({ width: 100, height: 50, left: 400 }), false)

		expect(capture.box).toEqual({ x: 0, y: 0, width: 320, height: 200 })
	})

	it('keeps the full root when the plot holds no drawing', () => {
		expect(prepareChartCapture(chart(), false).box).toEqual({ x: 0, y: 0, width: 320, height: 200 })
	})
})
