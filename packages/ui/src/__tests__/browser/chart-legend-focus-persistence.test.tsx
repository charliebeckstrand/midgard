import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { allBySlot, renderUI, waitFor } from '../helpers'

/**
 * The legend emphasises a series — dimming every other — while an entry is
 * pointed at or keyboard-focused. Focus and `:focus-visible` diverge only under
 * real input: a pointer click leaves the switch DOM-focused with no ring, and a
 * backgrounded tab re-fires `focus` on that retained element when the reader
 * returns. Either path would re-emphasise on raw `focus`, dimming the other
 * series with nothing visible to explain it. The modality that drives
 * `:focus-visible` is the browser's own, which `@testing-library/user-event`'s
 * synthetic events don't reproduce, so this rides the real Playwright input in
 * the browser suite.
 */
describe('chart legend focus persistence (real browser)', () => {
	const data = [
		{ q: 'Q1', rev: 10, cost: 5 },
		{ q: 'Q2', rev: 30, cost: 8 },
	]

	const series = [
		{ xKey: 'q', yKey: 'rev', yName: 'Revenue' },
		{ xKey: 'q', yKey: 'cost', yName: 'Costs' },
	] as const

	// Two categories × two series: bars run [rev Q1, rev Q2, cost Q1, cost Q2], so
	// a bar from the second series stands in for "the other series dimmed".
	const otherSeriesBar = (container: HTMLElement) => allBySlot(container, 'chart-bar')[2]

	const dimmed = (el: Element | undefined) =>
		(el?.getAttribute('class') ?? '').includes('opacity-25')

	// React commits the emphasis state after the focus event; settle two frames
	// before reading the marks so an absent dim reflects state, not timing.
	const settle = () =>
		new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

	it('does not dim the other series when a backgrounded tab re-fires focus on a clicked switch', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<BarChart aria-label="Quarterlies" data={data} series={[...series]} width={400} />
			</>,
		)

		const revenue = allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement

		// Toggle the series off then on — a reader inspecting it — so it stays
		// visible while the button holds the pointer's ring-less focus.
		await userEvent.click(revenue)
		await userEvent.click(revenue)
		await userEvent.unhover(revenue)
		await settle()

		// At rest the chart reads normally: the pointer left, the emphasis cleared.
		expect(revenue.matches(':focus-visible')).toBe(false)
		expect(dimmed(otherSeriesBar(container))).toBe(false)

		// Leaving and returning to the tab re-fires focus on the still-focused
		// switch (blur on leave, focus on return) without a keyboard's ring.
		revenue.blur()
		revenue.focus()
		await settle()

		expect(revenue.matches(':focus-visible')).toBe(false)
		// The regression: raw `focus` re-emphasised here, dimming Costs invisibly.
		expect(dimmed(otherSeriesBar(container))).toBe(false)
	})

	it('still dims the other series while a switch holds keyboard focus', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<BarChart
					aria-label="Quarterlies"
					data={data}
					series={[...series]}
					width={400}
					legend="top"
				/>
			</>,
		)

		const before = container.querySelector('button') as HTMLButtonElement
		const revenue = allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement

		// Tab into the legend from the preceding control: a keyboard focus carries
		// the ring, so it emphasises the way a hover does.
		before.focus()
		await userEvent.tab()

		expect(document.activeElement).toBe(revenue)
		expect(revenue.matches(':focus-visible')).toBe(true)

		await waitFor(() => expect(dimmed(otherSeriesBar(container))).toBe(true))
	})

	it('keeps the emphasis when a hover leaves a switch that still holds keyboard focus', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<BarChart
					aria-label="Quarterlies"
					data={data}
					series={[...series]}
					width={400}
					legend="top"
				/>
			</>,
		)

		const before = container.querySelector('button') as HTMLButtonElement
		const revenue = allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement

		// Keyboard-focus the first switch — the other series dims — then point at it
		// and leave. Hover doesn't disturb the ring, so the focus emphasis must hold.
		before.focus()
		await userEvent.tab()
		await waitFor(() => expect(dimmed(otherSeriesBar(container))).toBe(true))

		await userEvent.hover(revenue)
		await userEvent.unhover(revenue)
		await settle()

		expect(revenue.matches(':focus-visible')).toBe(true)
		// The regression: the pointer-leave cleared the still-held focus emphasis.
		expect(dimmed(otherSeriesBar(container))).toBe(true)
	})

	// A reference chip shares the switches' focus-visible gate but drives the
	// whole-marks recede (referenceActive), not the per-series dim — so it reads on
	// the marks group, which recedes as one to the rule.
	const marksReceded = (container: HTMLElement) =>
		(allBySlot(container, 'chart-marks')[0]?.getAttribute('class') ?? '').includes('opacity-25')

	it('recedes the marks while a reference chip holds keyboard focus', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<BarChart
					aria-label="Quarterlies"
					data={data}
					series={[...series]}
					width={400}
					legend="top"
					reference={[{ value: 20, label: 'Target' }]}
				/>
			</>,
		)

		const before = container.querySelector('button') as HTMLButtonElement
		const chip = allBySlot(container, 'chart-legend-reference')[0] as HTMLButtonElement

		// Tab into the legend (landing on the first switch), then rove past the two
		// switches to the reference chip: a keyboard focus carries the ring, so the
		// chip recedes the marks the way pointing the rule does.
		before.focus()
		await userEvent.tab()
		await userEvent.keyboard('{ArrowRight}{ArrowRight}')

		expect(document.activeElement).toBe(chip)
		expect(chip.matches(':focus-visible')).toBe(true)

		await waitFor(() => expect(marksReceded(container)).toBe(true))
	})

	it('does not recede the marks on a reference chip clicked into ring-less focus', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<BarChart
					aria-label="Quarterlies"
					data={data}
					series={[...series]}
					width={400}
					legend="top"
					reference={[{ value: 20, label: 'Target' }]}
				/>
			</>,
		)

		const chip = allBySlot(container, 'chart-legend-reference')[0] as HTMLButtonElement

		// Clicking the chip toggles its rule off and leaves the chip DOM-focused with
		// no ring; leaving must settle the marks back to full rather than stranding
		// them receded to the rule the click just pulled.
		await userEvent.click(chip)
		await userEvent.unhover(chip)
		await settle()

		expect(chip.matches(':focus-visible')).toBe(false)
		expect(marksReceded(container)).toBe(false)
	})
})
