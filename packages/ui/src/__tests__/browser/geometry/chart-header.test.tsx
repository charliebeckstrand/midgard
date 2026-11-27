import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../../modules/chart/bar-chart'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

// The ratio of two rounded lengths drifts from the declared ratio by less than this.
const ASPECT_SLACK = 0.05

/**
 * A chart title and subtitle band above the plot inside the aspect box, so the
 * drawing fills the height they leave rather than pushing past a 16/9 tile. At
 * the spark tier (where a header would crowd the marks) they leave the flow for
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

		const header = await waitFor(() => getSlot(container, 'chart-header'))

		expect(getSlot(container, 'chart-title').textContent).toBe('Revenue')

		expect(getSlot(container, 'chart-subtitle').textContent).toBe('by quarter')

		const figure = getSlot(container, 'chart-figure')

		const plot = getSlot(container, 'chart-plot')

		// Inline, not a veil: the header sits in the flow, above the plot.
		expect(getComputedStyle(header).position).not.toBe('absolute')

		expect(header.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			plot.getBoundingClientRect().top + 1,
		)

		// It sits inside the aspect box: the figure still resolves ~16/9, so header
		// and plot fit the ratio rather than overflowing a 16/9 tile.
		const figureRect = figure.getBoundingClientRect()

		expect(figureRect.width / figureRect.height).toBeNear(16 / 9, ASPECT_SLACK)

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

		const veil = await waitFor(() => getSlot(container, 'chart-header'))

		// A veil, not an inline header: absolute over the plot, and transparent at
		// rest so the sparkline reads as pure marks.
		expect(getComputedStyle(veil).position).toBe('absolute')

		expect(getComputedStyle(veil).opacity).toBe('0')

		// Hovering the chart fades it in.
		await userEvent.hover(getSlot(container, 'chart'))

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))
	})

	/*
	 * WCAG 1.4.13: the veil covers the whole sparkline, so a reader who points at the marks to
	 * see them, such as with a screen magnifier, must be able to put it away without moving the
	 * pointer. It stays away until the chart is neither hovered nor focused.
	 */
	it('hides the veil on Escape with the pointer still, until the pointer leaves', async () => {
		const { container } = renderUI(
			<>
				<BarChart
					aria-label="Rev"
					data={data}
					series={[{ xKey: 'q', yKey: 'rev' }]}
					title="Revenue"
					width={150}
				/>
				<p data-testid="away">Away</p>
			</>,
		)

		const veil = await waitFor(() => getSlot(container, 'chart-header'))

		const chart = getSlot(container, 'chart')

		await userEvent.hover(chart)

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('0'))

		await userEvent.hover(getSlot(container, 'chart-plot'))

		// A move inside the chart is not a new hover, so the veil stays away.
		expect(getComputedStyle(veil).opacity).toBe('0')

		await userEvent.hover(screen.getByTestId('away'))

		await userEvent.hover(chart)

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))
	})

	/*
	 * The veil mounts when the tier turns spark, and the pointer can already rest on the chart
	 * then, such as after a resize. Escape must still put it away.
	 */
	it('hides a veil that mounts under the pointer on Escape', async () => {
		const chart = (width: number) => (
			<BarChart
				aria-label="Rev"
				data={data}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				title="Revenue"
				width={width}
			/>
		)

		const { container, rerender } = renderUI(chart(600))

		await userEvent.hover(getSlot(container, 'chart'), { position: { x: 20, y: 20 } })

		rerender(chart(150))

		const veil = await waitFor(() => getSlot(container, 'chart-header'))

		await waitFor(() => expect(getComputedStyle(veil).position).toBe('absolute'))

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('1'))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(getComputedStyle(veil).opacity).toBe('0'))
	})
})
