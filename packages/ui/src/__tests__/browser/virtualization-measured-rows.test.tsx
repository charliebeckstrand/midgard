import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { JsonTree } from '../../components/json-tree'
import { densitySteps } from '../../core/density'
import { VirtualOptions } from '../../primitives/virtual-options'
import { present, renderUI, screen, waitFor } from '../helpers'
import { settledValue } from './helpers/sample'

/**
 * Measured rows of `VirtualOptions` and the windowed `JsonTree` (real browser).
 * A row height differs from `estimateSize` at a density other than the
 * default, and where a long value wraps. The window must follow the real
 * heights, so a key that goes to the last row shows that row.
 */

/** Whether the rect of `row` is inside the visible rect of `scroller`, to one pixel. */
function inView(row: HTMLElement, scroller: HTMLElement): boolean {
	const r = row.getBoundingClientRect()

	const s = scroller.getBoundingClientRect()

	return r.top >= s.top - 1 && r.bottom <= s.bottom + 1
}

/** The nearest ancestor of `node` that scrolls on the y axis. */
function scrollerOf(node: HTMLElement): HTMLElement {
	let el = node.parentElement

	while (el && !['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) el = el.parentElement

	return present(el, 'the scroller')
}

const COUNT = 200

const ITEMS = Array.from({ length: COUNT }, (_, i) => ({ id: i, label: `item-${i}` }))

describe('VirtualOptions measures each row', () => {
	for (const size of densitySteps) {
		// The Combobox keeps focus on its input, so only `scrollToIndex` brings the
		// active option into view. It reads the row positions, so a position from
		// a wrong height scrolls the list away from the active option.
		it(`each arrow keeps the active option in view at size ${size}`, async () => {
			renderUI(
				<Combobox<number> aria-label="Pick" size={size} displayValue={(v) => `item-${v}`}>
					<VirtualOptions items={ITEMS} getOptionId={(item) => `opt-${item.id}`}>
						{(item, _i, meta) => (
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

			const expectActiveInView = async (index: number) => {
				await waitFor(() => {
					expect(input.getAttribute('aria-activedescendant')).toBe(`opt-${index}`)

					const row = present(document.getElementById(`opt-${index}`), `option ${index}`)

					expect(inView(row, scrollerOf(row))).toBe(true)
				})
			}

			// ArrowUp from no highlight wraps to the last option.
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

const DATA = { list: Array.from({ length: COUNT }, (_, i) => `${i} ${LONG}`) }

/** Waits for two frames, so a scroll event and the render that it starts both land. */
const frames = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	)

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
					.map((r) => r.dataset.index)
					.join()}`,
		)

		const row = present(
			rows().find((r) => inView(r, tree)),
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
