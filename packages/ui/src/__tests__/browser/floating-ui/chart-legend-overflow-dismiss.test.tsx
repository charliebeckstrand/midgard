import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../../modules/chart/bar-chart'
import { allBySlot, frames, present, renderUI, waitFor } from '../../helpers'

/**
 * A switch in the `+N` overflow popover emphasizes its series while the pointer
 * rests on it. Escape closes the popover and unmounts the switch under the
 * pointer, so no `pointerleave` reaches it. The close itself must then clear the
 * emphasis. The dismiss comes from the live floating engine, which the `browser`
 * instance mocks, so this case runs in the `floating-ui` instance.
 */
describe('chart legend overflow dismiss (real browser)', () => {
	beforeAll(() => page.viewport(1000, 700))

	// Ten series in a 360px box: the one-row budget cannot hold them, so the cap
	// folds the rest into the `+N` chip. The legend sits under the plot, so the
	// popover opens below the chart. The pointer then rests on no mark after the
	// close, and a dim can only come from the legend.
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

	const dimmedBars = (container: HTMLElement) =>
		allBySlot(container, 'chart-bar').filter((bar) =>
			(bar.getAttribute('class') ?? '').includes('opacity-25'),
		).length

	it('clears the emphasis of a pointed overflow switch when Escape closes the popover', async () => {
		const { container } = renderUI(
			<BarChart aria-label="Ten series" data={data} series={series} width={360} legend="bottom" />,
		)

		await waitFor(() => expect(overflowChip(container)).not.toBeNull())

		await userEvent.click(overflowChip(container) as HTMLButtonElement)

		const panel = await waitFor(() =>
			present(document.querySelector('[data-slot="chart-legend-overflow"]'), 'the overflow panel'),
		)

		const target = allBySlot(panel, 'chart-legend-item')[0] as HTMLElement

		// The pointer rests on the switch, so every other series dims.
		await userEvent.hover(target)
		await waitFor(() => expect(dimmedBars(container)).toBeGreaterThan(0))

		await userEvent.keyboard('{Escape}')
		await waitFor(() =>
			expect(document.querySelector('[data-slot="chart-legend-overflow"]')).toBeNull(),
		)
		await frames()

		expect(dimmedBars(container)).toBe(0)
	})
})
