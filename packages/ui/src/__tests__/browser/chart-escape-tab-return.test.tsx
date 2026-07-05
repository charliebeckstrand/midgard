import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { bySlot, renderUI, userEvent, waitFor } from '../helpers'

/**
 * Escape leaves a chart's keyboard navigation by dropping focus to the body, the
 * same exit the legend gives. But a plain blur strands the chart: the next Tab
 * steps to the stop after it, so a reader who escapes to pause loses their place.
 * The region re-arms itself as that Tab's destination, so tabbing back returns to
 * the chart rather than skipping past it. Real Tab focus movement needs the
 * browser's focus engine, so this runs in the browser suite.
 */
describe('chart Escape then Tab returns to the plot (real browser)', () => {
	// One series, so no legend toggles sit between the plot and the trailing
	// button — the tab order is before, plot, after and nothing else.
	const data = [
		{ week: 'W1', a: 10 },
		{ week: 'W2', a: 30 },
	]

	const series = [{ xKey: 'week', yKey: 'a', yName: 'A' }] as const

	it('re-focuses the plot on the Tab after Escape, then steps on', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<LineChart aria-label="Signups" data={data} series={[...series]} width={400} />

				<button type="button">after</button>
			</>,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		const after = container.querySelector('button:last-child') as HTMLElement

		plot.focus()

		// Enter navigation, then escape it: focus drops to the body.
		await user.keyboard('{ArrowRight}')

		await user.keyboard('{Escape}')

		await waitFor(() => expect(document.activeElement).toBe(document.body))

		// The next Tab returns to the plot rather than the following button.
		await user.tab()

		expect(document.activeElement).toBe(plot)

		// A second Tab then steps on to the next stop, unhindered.
		await user.tab()

		expect(document.activeElement).toBe(after)
	})
})
