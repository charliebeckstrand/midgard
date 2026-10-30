import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { allBySlot, frames, present, renderUI, waitFor } from '../helpers'

/**
 * A resize that lowers the fit of a capped legend folds the last switches into
 * the `+N` chip, and a resize that raises it removes the chip. Either cut can
 * unmount the control that holds the focus. The focus then must stay in the
 * row, not fall to the document body. The fit reads a ResizeObserver over the
 * real layout, so the case runs in a real browser.
 */
describe('chart legend fit focus (real browser)', () => {
	const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']

	const data: Record<string, string | number>[] = [
		{ q: 'Q1', ...Object.fromEntries(names.map((name, index) => [name, 10 + index])) },
		{ q: 'Q2', ...Object.fromEntries(names.map((name, index) => [name, 20 + index])) },
	]

	const series = names.map((name) => ({ xKey: 'q', yKey: name, yName: name }))

	const chart = (width: number) => (
		<>
			<button type="button">before</button>

			<BarChart aria-label="Six series" data={data} series={series} width={width} legend="bottom" />
		</>
	)

	const chip = (container: HTMLElement) =>
		container.querySelector<HTMLElement>('[data-slot="chart-legend-more"]')

	const dimmedBars = (container: HTMLElement) =>
		allBySlot(container, 'chart-bar').filter((bar) =>
			(bar.getAttribute('class') ?? '').includes('opacity-25'),
		).length

	it('keeps the focus in the row when a resize folds or unfolds the focused control', async () => {
		const { container, rerender } = renderUI(chart(900))

		await waitFor(() => expect(allBySlot(container, 'chart-legend-item')).toHaveLength(6))

		expect(chip(container)).toBeNull()

		// Tab past the plot into the row, then End to the last switch: a keyboard
		// focus that emphasizes its series.
		await userEvent.click(present(container.querySelector('button'), 'the button before the chart'))
		await userEvent.tab()
		await userEvent.tab()
		await userEvent.keyboard('{End}')

		const last = allBySlot(container, 'chart-legend-item').at(-1) as HTMLElement

		expect(document.activeElement).toBe(last)

		await waitFor(() => expect(dimmedBars(container)).toBeGreaterThan(0))

		// A narrow box folds the last switch into the chip, so the focus follows it
		// there, and the gone switch holds no emphasis.
		rerender(chart(320))

		await waitFor(() => expect(chip(container)).not.toBeNull())

		expect(last.isConnected).toBe(false)

		expect(document.activeElement).toBe(chip(container))

		await frames()

		expect(dimmedBars(container)).toBe(0)

		// A wide box shows every switch again and removes the chip, so the focus
		// moves to the last switch.
		rerender(chart(900))

		await waitFor(() => expect(chip(container)).toBeNull())

		expect(document.activeElement).toBe(allBySlot(container, 'chart-legend-item').at(-1))
	})
})
