import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { PieChart } from '../../modules/chart/pie-chart'
import { getSlot, renderUI, screen, waitFor } from '../helpers'

/**
 * A side-panel legend past five entries pages them. The pager keeps the focus
 * at the end of the range (WCAG 2.4.3). A natively disabled button drops the
 * focus to the body, so the button at an end announces `aria-disabled` and
 * ignores the press. The focus fixup is the engine's own, so this case runs in
 * the browser.
 */
describe('chart legend pager focus (real browser)', () => {
	// The panel rail engages at the chart's `@sm` width, which 640px clears.
	beforeAll(() => page.viewport(960, 640))

	const data = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((source, index) => ({
		source,
		visits: 10 + index,
	}))

	it('keeps the focus on Next when it reaches the last page', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={data}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={640}
				height={320}
				legend="right"
			/>,
		)

		const pager = getSlot(container, 'chart-legend-pagination')

		const next = screen.getByRole('button', { name: 'Next legend entries' })

		const previous = screen.getByRole('button', { name: 'Previous legend entries' })

		// Seven entries make two pages.
		expect(pager).toHaveTextContent('1 / 2')

		next.focus()
		await userEvent.keyboard('{Enter}')
		await waitFor(() => expect(pager).toHaveTextContent('2 / 2'))

		expect(document.activeElement).toBe(next)
		expect(next).toHaveAttribute('aria-disabled', 'true')

		// A press at the end does nothing.
		await userEvent.keyboard('{Enter}')

		expect(pager).toHaveTextContent('2 / 2')
		expect(document.activeElement).toBe(next)

		// Previous leads back to the first page, where it announces the end.
		previous.focus()
		await userEvent.keyboard('{Enter}')
		await waitFor(() => expect(pager).toHaveTextContent('1 / 2'))

		expect(document.activeElement).toBe(previous)
		expect(previous).toHaveAttribute('aria-disabled', 'true')
		expect(next).not.toHaveAttribute('aria-disabled')
	})
})
