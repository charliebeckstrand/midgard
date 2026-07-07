import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { bySlot, renderUI, waitFor } from '../helpers'

/**
 * A chart title and subtitle band above the plot inside the aspect box, so the
 * drawing fills the height they leave rather than pushing past a 16/9 tile. At
 * the spark tier — where a header would crowd the marks — they leave the flow for
 * a centered veil over the plot, faded in on hover or focus. Placement inside the
 * ratio, the veil's rest-state transparency, and its reveal are computed-layout
 * claims jsdom can't resolve, so they ride the real browser.
 */
describe('chart header (real browser)', () => {
	beforeAll(() => page.viewport(900, 700))

	const data = [
		{ q: 'Q1', rev: 40 },
		{ q: 'Q2', rev: 55 },
	]

	it('bands the header above the plot inside the aspect box at a framed tier', async () => {
		const { container } = renderUI(
			// An auto-height parent, so the 16/9 figure governs: the header + plot must
			// fit the ratio rather than overflow it.
			<div style={{ width: 600 }}>
				<BarChart
					aria-label="Revenue"
					data={data}
					series={[{ xKey: 'q', yKey: 'rev' }]}
					title="Revenue"
					subtitle="by quarter"
					aspectRatio={16 / 9}
				/>
			</div>,
		)

		const header = await waitFor(() => {
			const el = bySlot(container, 'chart-header') as HTMLElement | null

			expect(el).not.toBeNull()

			return el as HTMLElement
		})

		expect((bySlot(container, 'chart-title') as HTMLElement).textContent).toBe('Revenue')

		expect((bySlot(container, 'chart-subtitle') as HTMLElement).textContent).toBe('by quarter')

		const figure = bySlot(container, 'chart-figure') as HTMLElement

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Inline, not a veil: the header sits in the flow, above the plot.
		expect(getComputedStyle(header).position).not.toBe('absolute')

		expect(header.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			plot.getBoundingClientRect().top + 1,
		)

		// It sits inside the aspect box: the figure still resolves ~16/9, so header
		// and plot fit the ratio rather than overflowing a 16/9 tile.
		const figureRect = figure.getBoundingClientRect()

		expect(figureRect.width / figureRect.height).toBeCloseTo(16 / 9, 1)

		expect(header.getBoundingClientRect().top).toBeGreaterThanOrEqual(figureRect.top - 1)
	})

	it('veils the header over the marks at the spark tier, revealed on hover', async () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Rev"
				data={data}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				title="Revenue"
				width={150}
			/>,
		)

		const veil = await waitFor(() => {
			const el = bySlot(container, 'chart-header') as HTMLElement | null

			expect(el).not.toBeNull()

			return el as HTMLElement
		})

		// A veil, not an inline header: absolute over the plot, and transparent at
		// rest so the sparkline reads as pure marks.
		expect(getComputedStyle(veil).position).toBe('absolute')

		expect(getComputedStyle(veil).opacity).toBe('0')

		// Hovering the chart fades it in.
		await userEvent.hover(bySlot(container, 'chart') as HTMLElement)

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))
	})
})
