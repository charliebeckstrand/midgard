import { describe, expect, it } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import { renderUI, waitFor } from '../helpers'

/**
 * Callout cards under a real engine: jsdom stubs every box to zero, so the
 * measured layout — the card's actual width feeding the radius solve, the flush
 * pin to the plot edge — can only be seen in the browser. The pie shrinks to
 * seat the widest column and each card's outer edge sits on the plot-region
 * edge its side names, the pixel contract the solver promises.
 */

const DATA = [
	{ source: 'Search', visits: 60 },
	{ source: 'Direct', visits: 25 },
	{ source: 'Referral', visits: 15 },
	{ source: 'Paid social retargeting', visits: 40 },
]

/** The visible (placed) callout cards — the hidden measurement stand-ins are excluded. */
function visibleCards(container: HTMLElement): HTMLElement[] {
	return [
		...container.querySelectorAll<HTMLElement>('[data-slot="chart-callout"]:not([data-hidden])'),
	]
}

describe('pie callout cards (real browser)', () => {
	it('flushes each card to the plot edge its side names, from real measurement', async () => {
		const { container } = renderUI(
			<div style={{ width: 480 }}>
				<PieChart
					aria-label="Traffic by source"
					data={DATA}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					labels={{ callouts: true }}
				/>
			</div>,
		)

		const plot = container.querySelector<HTMLElement>('[data-slot="chart-plot"]')

		if (!plot) throw new Error('no plot region rendered')

		// The cards mount hidden, measure in a layout effect, then place and reveal.
		await waitFor(() => expect(visibleCards(container).length).toBeGreaterThan(0))

		const plotRect = plot.getBoundingClientRect()

		let sawRight = false

		let sawLeft = false

		for (const card of visibleCards(container)) {
			const rect = card.getBoundingClientRect()

			const flushRight = Math.abs(rect.right - plotRect.right) <= 1.5

			const flushLeft = Math.abs(rect.left - plotRect.left) <= 1.5

			// Every card sits flush to exactly one plot edge — the ragged edge faces
			// the pie, never the frame.
			expect(flushRight || flushLeft).toBe(true)

			sawRight ||= flushRight

			sawLeft ||= flushLeft
		}

		// This sample straddles the vertical, so both columns are exercised.
		expect(sawRight).toBe(true)

		expect(sawLeft).toBe(true)
	})

	it('shrinks the pie inside the square so the cards clear the arc', async () => {
		const { container } = renderUI(
			<div style={{ width: 480 }}>
				<PieChart
					aria-label="Traffic by source"
					data={DATA}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					labels={{ callouts: true }}
				/>
			</div>,
		)

		const plot = container.querySelector<HTMLElement>('[data-slot="chart-plot"]')

		if (!plot) throw new Error('no plot region rendered')

		await waitFor(() => expect(visibleCards(container).length).toBeGreaterThan(0))

		const plotRect = plot.getBoundingClientRect()

		// The disc's bounding box, unioned across the slice paths.
		const slices = [...container.querySelectorAll<SVGPathElement>('[data-slot="chart-slice"]')]

		expect(slices.length).toBeGreaterThan(0)

		const discRight = Math.max(...slices.map((slice) => slice.getBoundingClientRect().right))

		const discLeft = Math.min(...slices.map((slice) => slice.getBoundingClientRect().left))

		// The pie shrank off both horizontal edges of the square to make room, so a
		// gap sits between the arc and either plot edge.
		expect(plotRect.right - discRight).toBeGreaterThan(1)

		expect(discLeft - plotRect.left).toBeGreaterThan(1)
	})
})
