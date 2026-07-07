import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'

/**
 * A stacked legend caps to the frame tier's row budget: the controls past it
 * fold into a `+N` chip that opens the rest as a popover switchboard. So a
 * many-series legend can never take unbounded height from the aspect box and
 * crush the plot, and no switch is ever clipped out of reach — the complaint
 * that drove the redesign. The cut is measured from an invisible ghost row that
 * holds every control at all times; that measurement, the bounded height, and
 * the popover mount are computed-layout claims jsdom can't resolve, so this
 * rides the real browser.
 */
describe('chart stacked legend row cap (real browser)', () => {
	beforeAll(() => page.viewport(1000, 700))

	// Ten short-labelled series over a narrow, short frame: the plot resolves to a
	// one-row legend budget, and ten switches can't sit on one row of a 360px box,
	// so the cap must bite and chip the overflow.
	const names = [
		'Alpha',
		'Bravo',
		'Charlie',
		'Delta',
		'Echo',
		'Foxtrot',
		'Golf',
		'Hotel',
		'India',
		'Juliet',
	]

	const data: Record<string, string | number>[] = [
		{ q: 'Q1', ...Object.fromEntries(names.map((n, i) => [n, 10 + i])) },
		{ q: 'Q2', ...Object.fromEntries(names.map((n, i) => [n, 20 + i])) },
	]

	const series = names.map((n) => ({ xKey: 'q', yKey: n, yName: n }))

	const overflowChip = (root: ParentNode) =>
		root.querySelector('[aria-label^="Show "]') as HTMLButtonElement | null

	it('chips the overflow, keeps the row to its budget, and never mounts a hidden switch off-screen', async () => {
		const { container } = renderUI(
			<BarChart aria-label="Ten series" data={data} series={series} width={360} legend="top" />,
		)

		// The chip lands once the ghost measures the overflow (a layout effect after
		// the first paint), so wait for it rather than reading a pre-measure frame.
		await waitFor(() => expect(overflowChip(container)).not.toBeNull())

		const chip = overflowChip(container) as HTMLButtonElement

		const visibleItems = allBySlot(container, 'chart-legend-item')

		const ghostItems = allBySlot(container, 'chart-legend-ghost')

		// Every series is measured on the ghost; only a proper subset shows.
		expect(ghostItems.length).toBe(10)
		expect(visibleItems.length).toBeGreaterThan(0)
		expect(visibleItems.length).toBeLessThan(10)

		// The chip's count is exactly the switches it stands in for — none lost.
		const chipCount = Number(chip.getAttribute('aria-label')?.match(/\d+/)?.[0])

		expect(chipCount).toBe(10 - visibleItems.length)

		// The cap holds the visible row to its one-row budget: the ghost carries all
		// ten (many rows) but sits out of flow, so the wrapper it shares with the
		// visible row measures the one row, not the ghost's stack.
		const legend = bySlot(container, 'chart-legend') as HTMLElement

		const wrapper = legend.parentElement as HTMLElement

		const rowHeight = (visibleItems[0] as HTMLElement).offsetHeight

		expect(legend.getBoundingClientRect().height).toBeLessThan(rowHeight * 1.6)
		expect(wrapper.getBoundingClientRect().height).toBeLessThan(rowHeight * 1.6)
	})

	it('opens the overflow as a switchboard whose switches toggle the same series', async () => {
		const { container } = renderUI(
			<BarChart aria-label="Ten series" data={data} series={series} width={360} legend="top" />,
		)

		await waitFor(() => expect(overflowChip(container)).not.toBeNull())

		// The visible row itself, so its switch count reads free of the popover's own
		// (which may portal inside the container once open).
		const row = bySlot(container, 'chart-legend') as HTMLElement

		const before = allBySlot(row, 'chart-legend-item').length

		await userEvent.click(overflowChip(container) as HTMLButtonElement)

		// The panel teleports through a portal; find it on the document, then read the
		// switchboard it holds.
		const panel = await waitFor(() => {
			const found = document.querySelector('[data-slot="popover-content"]') as HTMLElement | null

			expect(found).not.toBeNull()

			return found as HTMLElement
		})

		const switches = allBySlot(panel, 'chart-legend-item') as HTMLButtonElement[]

		// The panel holds the overflow switches (a page of them, if it paginates), all
		// on at first.
		expect(switches.length).toBeGreaterThan(0)

		const target = switches[0] as HTMLButtonElement

		expect(target.getAttribute('aria-pressed')).toBe('true')

		// Toggling a panel switch drives the same series-hidden set the row's switches
		// do: the switch reads off, and one grouped bar per category drops from the
		// plot (two categories, so two bars for the toggled series).
		const barsBefore = allBySlot(container, 'chart-bar').length

		await userEvent.click(target)

		await waitFor(() => expect(target.getAttribute('aria-pressed')).toBe('false'))

		expect(allBySlot(container, 'chart-bar').length).toBe(barsBefore - 2)

		// Toggling a folded-away series doesn't reshuffle the visible row: the cut
		// holds, so the chip still stands for the same overflow it opened.
		expect(overflowChip(container)?.getAttribute('aria-label')).toBe(`Show ${10 - before} more`)
	})
})

/**
 * The pie was the chart the complaint named: a many-slice legend under the plot
 * used to stack row on row and push its entries past where they could be seen.
 * Now the pie reads the same intrinsic tier as a cartesian chart, so its stacked
 * legend caps and chips the overflow just the same.
 */
describe('pie stacked legend row cap (real browser)', () => {
	beforeAll(() => page.viewport(1000, 700))

	// Ten slices under a bottom legend on a narrow pie — the one-row budget the
	// 360px box resolves can't hold them, so the cap must bite.
	const slices = [
		'Alpha',
		'Bravo',
		'Charlie',
		'Delta',
		'Echo',
		'Foxtrot',
		'Golf',
		'Hotel',
		'India',
		'Juliet',
	]

	const data = slices.map((label, index) => ({ label, value: 10 + index }))

	it('caps a many-slice pie legend and chips the overflow', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Ten slices"
				data={data}
				series={[{ xKey: 'label', yKey: 'value' }]}
				width={360}
				legend="bottom"
			/>,
		)

		await waitFor(() => expect(container.querySelector('[aria-label^="Show "]')).not.toBeNull())

		const chip = container.querySelector('[aria-label^="Show "]') as HTMLButtonElement

		const visible = allBySlot(container, 'chart-legend-item')

		const ghost = allBySlot(container, 'chart-legend-ghost')

		// Every slice is measured on the ghost; only a subset shows, the rest chipped.
		expect(ghost.length).toBe(10)

		expect(visible.length).toBeGreaterThan(0)

		expect(visible.length).toBeLessThan(10)

		expect(Number(chip.getAttribute('aria-label')?.match(/\d+/)?.[0])).toBe(10 - visible.length)

		// The capped legend holds to its one-row budget rather than stacking ten rows
		// under the pie.
		const legend = bySlot(container, 'chart-legend') as HTMLElement

		const rowHeight = (visible[0] as HTMLElement).offsetHeight

		expect(legend.getBoundingClientRect().height).toBeLessThan(rowHeight * 1.6)
	})
})
