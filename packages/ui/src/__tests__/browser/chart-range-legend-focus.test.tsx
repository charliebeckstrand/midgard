import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { frames, getSlot, present, renderUI, waitFor } from '../helpers'

/**
 * The range bar emphasizes a class while the pointer probes it, or while the bar
 * holds a keyboard focus. The keyboard side rides `:focus-visible`, the same gate
 * as the ring, as the chart legend does. A click leaves the bar focused with no
 * ring, and a tab that comes back fires `focus` again with no ring. Neither can
 * dim the chart. Only real input sets `:focus-visible`, so this runs in the
 * browser.
 */
describe('range legend focus (real browser)', () => {
	type Row = { day: string; hour: string; commits: number }

	const rows: Row[] = [
		{ day: 'Mon', hour: '9', commits: 1 },
		{ day: 'Mon', hour: '10', commits: 9 },
		{ day: 'Tue', hour: '9', commits: 5 },
		{ day: 'Tue', hour: '10', commits: 3 },
	]

	const series = [
		{
			xKey: 'hour',
			yKey: 'day',
			colorKey: 'commits',
			colorRange: ['#f7fee7', '#365314'],
			colorName: 'Commits',
		},
	] satisfies [HeatmapChartSeries<Row>]

	const dimmed = (container: HTMLElement) =>
		[...container.querySelectorAll('[data-slot="heatmap-cells"] rect')].filter((rect) =>
			(rect.getAttribute('class') ?? '').includes('opacity-25'),
		).length

	const renderHeatmap = () =>
		renderUI(
			<>
				<button type="button">before</button>

				<HeatmapChart aria-label="Commits" data={rows} series={series} width={400} />
			</>,
		)

	it('clears the probe when the pointer leaves a bar that a click focused', async () => {
		const { container } = renderHeatmap()

		const track = getSlot(container, 'heatmap-range-track')

		await userEvent.click(track)

		expect(document.activeElement).toBe(track)
		expect(track.matches(':focus-visible')).toBe(false)

		await userEvent.unhover(track)
		await frames()

		expect(dimmed(container)).toBe(0)

		// A tab that comes back fires `focus` again with no ring.
		track.blur()
		track.focus()
		await frames()

		expect(track.matches(':focus-visible')).toBe(false)
		expect(dimmed(container)).toBe(0)
	})

	it('keeps the probe of a keyboard focus when the pointer passes off the bar', async () => {
		const { container } = renderHeatmap()

		const before = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		const track = getSlot(container, 'heatmap-range-track')

		before.focus()

		// Tab past the plot to the bar, the next stop that is a slider.
		while (document.activeElement !== track) await userEvent.tab()

		expect(track.matches(':focus-visible')).toBe(true)

		await waitFor(() => expect(dimmed(container)).toBeGreaterThan(0))

		await userEvent.hover(track)
		await userEvent.unhover(track)
		await frames()

		expect(dimmed(container)).toBeGreaterThan(0)
	})
})
