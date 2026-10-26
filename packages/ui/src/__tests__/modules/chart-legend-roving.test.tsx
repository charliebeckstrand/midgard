import { describe, expect, it } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, allBySlot, fireEvent, getSlot, renderUI, screen } from '../helpers'

/**
 * The legend row is a toolbar: one Tab stop, and the arrow keys rove between
 * its controls. The page buttons of a side panel sit inside the toolbar, so they
 * share the one stop, and the arrows reach them from the switches.
 */
describe('chart legend roving', () => {
	const data = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((source, index) => ({
		source,
		visits: 10 + index,
	}))

	function pie() {
		return renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={data}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={640}
				height={320}
				legend="right"
			/>,
		)
	}

	it('keeps the page buttons off the Tab order at rest', () => {
		const { container } = pie()

		const legend = getSlot(container, 'chart-legend')

		const pages = allBySlot(legend, 'chart-legend-page') as HTMLButtonElement[]

		expect(pages).toHaveLength(2)

		for (const button of pages) expect(button.tabIndex).toBe(-1)

		const stops = Array.from(legend.querySelectorAll<HTMLElement>('button')).filter(
			(button) => button.tabIndex === 0,
		)

		expect(stops).toHaveLength(1)
	})

	it('roves from the switches to the page buttons with the arrows', () => {
		const { container } = pie()

		const switches = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		const last = switches.at(-1) as HTMLButtonElement

		act(() => last.focus())

		fireEvent.keyDown(last, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Previous legend entries' }),
		)

		fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next legend entries' }))
	})
})
