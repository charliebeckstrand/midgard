import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { getSlot, renderUI } from '../helpers'
import { legendItem } from '../helpers/chart-legend'
import { renderZones } from './helpers/map-zones'

/** The paint of a legend part that the off look changes: its line decoration and its opacity. */
function look(node: Element | null | undefined) {
	if (!node) throw new Error('expected a legend part')

	const style = getComputedStyle(node)

	return { line: style.textDecorationLine, opacity: style.opacity }
}

/** The look of a part of an entry that is on. */
const on = { line: 'none', opacity: '1' }

/** The look of the label of an entry that is off. */
const struck = { line: 'line-through', opacity: '0.6' }

/** The look of a readout or a description of an entry that is off. */
const dim = { line: 'none', opacity: '0.6' }

/** The look of the key of an entry that is off. */
const faint = { line: 'none', opacity: '0.4' }

/**
 * A legend entry that is toggled off strikes its label and dims its readout and
 * its key. The chart kata keys that look on the `aria-pressed` of the switch that
 * holds each part, so the file reads the paint in a real browser. jsdom loads no
 * stylesheet.
 */
describe('the look of a legend entry toggled off (real browser)', () => {
	it('strikes a series entry and dims its share and its swatch', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={[
					{ source: 'Search', visits: 60 },
					{ source: 'Direct', visits: 40 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				legend="right"
				width={520}
			/>,
		)

		const entry = legendItem(container, 'Search')

		const [label, share] = entry.querySelectorAll(':scope > span > span')

		const parts = () => [
			look(label?.firstElementChild),
			look(share),
			look(entry.querySelector('[data-slot="swatch"]')),
		]

		expect(parts()).toEqual([on, on, on])

		await userEvent.click(entry)

		expect(entry).toBeUnpressed()

		expect(parts()).toEqual([struck, dim, faint])
	})

	it('strikes a reference note and dims its value, its description, and its swatch', async () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 80 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				reference={[{ value: 60, label: 'Target', description: 'Set in January' }]}
				legend={{ references: { variant: 'notes' } }}
				width={520}
			/>,
		)

		const note = getSlot(container, 'chart-legend-reference')

		// The value carries a slot of its own, so the two texts are the label and the description.
		const [label, description] = note.querySelectorAll('[data-slot="text"]')

		const parts = () => [
			look(label),
			look(getSlot(note, 'chart-legend-reference-value')),
			look(description),
			look(note.querySelector('[data-slot="swatch"]')),
		]

		expect(description?.textContent).toBe('Set in January')

		expect(parts()).toEqual([on, on, on, on])

		await userEvent.click(note)

		expect(note).toBeUnpressed()

		expect(parts()).toEqual([struck, dim, dim, faint])
	})

	it('strikes a map entry and dims its swatch', async () => {
		const { container } = await renderZones(['North', 'South'])

		const entry = getSlot(container, 'map-legend-item')

		const parts = () => [
			look(getSlot(entry, 'map-legend-label')),
			look(entry.querySelector('[data-slot="swatch"]')),
		]

		expect(parts()).toEqual([on, on])

		await userEvent.click(entry)

		expect(entry).toBeUnpressed()

		expect(parts()).toEqual([struck, faint])
	})
})
