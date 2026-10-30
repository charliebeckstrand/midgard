import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { JsonTree } from '../../components/json-tree'
import { densitySteps } from '../../core/density'
import { VirtualOptions } from '../../primitives/virtual-options'
import { frames, present, renderUI, screen, waitFor } from '../helpers'
import { settledValue } from './helpers/sample'

/**
 * Measured rows of `VirtualOptions` and the windowed `JsonTree` (real browser).
 * A row height differs from `estimateSize` at a density other than the
 * default, and where a long value wraps. The window must follow the real
 * heights, so a key that goes to the last row shows that row.
 */

/** Whether the rect of `row` is inside the visible rect of `scroller`, to one pixel. */
function inView(row: HTMLElement, scroller: HTMLElement): boolean {
	const rowBox = row.getBoundingClientRect()

	const scrollerBox = scroller.getBoundingClientRect()

	return rowBox.top >= scrollerBox.top - 1 && rowBox.bottom <= scrollerBox.bottom + 1
}

/** The nearest ancestor of `node` that scrolls on the y axis. */
function findScroller(node: HTMLElement): HTMLElement {
	let el = node.parentElement

	while (el && !['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) el = el.parentElement

	return present(el, 'the scroller')
}

/** Waits until the option at `index` is active and in view in the list. */
const expectActiveInView = vi.defineHelper(async (index: number) => {
	await waitFor(() => {
		expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(`opt-${index}`)

		const row = present(document.getElementById(`opt-${index}`), `option ${index}`)

		expect(inView(row, findScroller(row))).toBe(true)
	})
})

const COUNT = 200

const ITEMS = Array.from({ length: COUNT }, (_, index) => ({ id: index, label: `item-${index}` }))

describe('VirtualOptions measures each row', () => {
	for (const size of densitySteps) {
		// The Combobox keeps focus on its input, so only `scrollToIndex` brings the
		// active option into view. It reads the row positions, so a position from
		// a wrong height scrolls the list away from the active option.
		it(`each arrow keeps the active option in view at size ${size}`, async () => {
			renderUI(
				<Combobox<number> aria-label="Pick" size={size} displayValue={(value) => `item-${value}`}>
					<VirtualOptions items={ITEMS} getOptionId={(item) => `opt-${item.id}`}>
						{(item, _index, meta) => (
							<ComboboxOption key={item.id} id={`opt-${item.id}`} value={item.id} {...meta}>
								<ComboboxLabel>{item.label}</ComboboxLabel>
							</ComboboxOption>
						)}
					</VirtualOptions>
				</Combobox>,
			)

			const input = screen.getByRole('combobox')

			await userEvent.click(input)

			await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))

			// ArrowUp from no highlight wraps to the last option. Each later step
			// attaches a row above the viewport, which measures and moves the offset.
			// The console guard fails the case on a `flushSync` warning from that
			// measure in a commit.
			await userEvent.keyboard('{ArrowUp}')

			await expectActiveInView(COUNT - 1)

			for (let index = COUNT - 2; index >= COUNT - 30; index--) {
				await userEvent.keyboard('{ArrowUp}')

				await expectActiveInView(index)
			}
		})
	}
})

// A value that wraps to a few lines: taller than the guess, shorter than the scroller.
const LONG = 'lorem ipsum dolor sit amet '.repeat(4)

const DATA = { list: Array.from({ length: COUNT }, (_, index) => `${index} ${LONG}`) }

describe('JsonTree measures each row', () => {
	// The top spacer stands in for the rows above the window. A spacer that
	// counts a 24 px guess for each of those rows moves the rendered rows each
	// time the window drops a taller row, so the content jumps under the reader.
	it('a row in view moves with the scroll when long values wrap', async () => {
		renderUI(
			<div style={{ width: 240 }}>
				<JsonTree
					data={DATA}
					rootKey="root"
					defaultExpandDepth={Number.POSITIVE_INFINITY}
					virtualize={{ maxHeight: '240px', overscan: 2 }}
				/>
			</div>,
		)

		const tree = present(screen.getByRole('tree'), 'the tree')

		const rows = () => Array.from(tree.querySelectorAll<HTMLElement>('[data-index]'))

		await waitFor(() => expect(rows().length).toBeGreaterThan(2))

		// A wrapped value makes a leaf taller than the 24 px guess.
		expect(present(rows()[2], 'the first leaf').getBoundingClientRect().height).toBeGreaterThan(48)

		tree.scrollTop = 2000

		// The rows of the new window measure, and the window settles. Each measure
		// can move the offset, so the wait reads the page, not a count of frames.
		await settledValue(
			() =>
				`${tree.scrollTop}:${rows()
					.map((row) => row.dataset.index)
					.join()}`,
		)

		const row = present(
			rows().find((candidate) => inView(candidate, tree)),
			'a row in view',
		)

		const index = row.dataset.index

		const top = row.getBoundingClientRect().top

		const start = tree.scrollTop

		for (let step = 1; step <= 20; step++) {
			tree.scrollTop = start + step * 10

			await frames()

			const same = present(
				tree.querySelector<HTMLElement>(`[data-index="${index}"]`),
				`row ${index}`,
			)

			expect(Math.round(same.getBoundingClientRect().top)).toBe(Math.round(top - step * 10))
		}
	})
})
