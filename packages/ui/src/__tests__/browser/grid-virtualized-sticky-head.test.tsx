import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, getSlot, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The keyboard cursor over a virtualized grid with a sticky header, in a real
 * browser. The virtualizer scrolls a row into its window by its own offsets.
 * Those offsets must count the header and the new-row slot above the first
 * row, so the active cell lands clear of the sticky chrome (WCAG 2.4.11).
 *
 * The active cell then scrolls into view by its `scroll-margin`. In Chromium
 * that second scroll hides a wrong offset from the virtualizer before a paint.
 * So each case also records the first offset that the virtualizer writes on a
 * step, and holds it equal to the offset where the scroll ends.
 */
describe('grid virtualized cursor under a sticky header (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	// The uniform window needs the real row height, which is 40 pixels at the
	// default density.
	const ROW = 40

	function renderGrid({ newRow }: { newRow?: 'top' | 'bottom' } = {}) {
		const view = renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: ROW }}
					header={{ position: 'sticky' }}
					maxHeight="220px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					{...(newRow
						? { editable: { session: 'managed', newRow, onRowAdd: vi.fn(), onCommit: vi.fn() } }
						: {})}
				/>
			</div>,
		)

		const scroll = getSlot(view.container, 'grid-scroll')

		// The virtualizer scrolls through `scrollTo`, and the cell's own scroll
		// does not. Record each offset that the virtualizer writes.
		const writes: number[] = []

		const scrollTo = scroll.scrollTo.bind(scroll)

		scroll.scrollTo = ((options: ScrollToOptions) => {
			if (typeof options?.top === 'number') writes.push(options.top)

			scrollTo(options)
		}) as typeof scroll.scrollTo

		return { ...view, scroll, writes }
	}

	/** The cell that the cursor names through `aria-activedescendant`. */
	const activeCell = () => {
		const id = screen.getByRole('grid').getAttribute('aria-activedescendant')

		return present(id ? document.getElementById(id) : null, 'the active cell')
	}

	/**
	 * The part of the scroll container that no sticky chrome covers: below the
	 * header and a top new-row slot, and above a bottom new-row slot and the
	 * horizontal scrollbar.
	 */
	const clearBox = (scroll: HTMLElement) => {
		const head = present(scroll.querySelector<HTMLElement>('thead'), 'thead')

		const slot = scroll.querySelector<HTMLElement>('[data-slot="grid-new-row"]')

		const bottomSlot = slot?.dataset.position === 'bottom'

		const top = Math.max(
			head.getBoundingClientRect().bottom,
			(!bottomSlot && slot?.getBoundingClientRect().bottom) || 0,
		)

		const edge = scroll.getBoundingClientRect().top + scroll.clientHeight

		return {
			top,
			bottom: slot && bottomSlot ? Math.min(edge, slot.getBoundingClientRect().top) : edge,
		}
	}

	/**
	 * Holds the active cell clear of the sticky chrome. Holds the first offset
	 * that the virtualizer wrote on the step equal to the offset where the
	 * scroll ended, and then clears the record for the next step.
	 */
	const expectClear = (scroll: HTMLElement, writes: number[]) => {
		const box = clearBox(scroll)

		const cell = activeCell().getBoundingClientRect()

		expect(cell.top).toBeGreaterThanOrEqual(box.top - 1)

		expect(cell.bottom).toBeLessThanOrEqual(box.bottom + 1)

		const [written] = writes

		if (written !== undefined) expect(Math.abs(written - scroll.scrollTop)).toBeLessThanOrEqual(1)

		writes.length = 0
	}

	for (const newRow of [undefined, 'top', 'bottom'] as const) {
		const label = newRow ? `with a ${newRow} new-row slot` : 'with no slot'

		it(`keeps each cursor step clear of the sticky chrome, down and back up, ${label}`, async () => {
			const { scroll, writes } = renderGrid({ newRow })

			await waitFor(() => expect(scroll.querySelector('tr[data-row-index="0"]')).not.toBeNull())

			screen.getByRole('grid').focus()

			// Twelve steps down run past the bottom edge of a 220 pixel viewport.
			for (let step = 0; step < 12; step++) {
				await userEvent.keyboard('{ArrowDown}')

				await frames()

				expectClear(scroll, writes)
			}

			expect(scroll.scrollTop).toBeGreaterThan(0)

			// The steps back up run past the top edge, under the sticky header.
			for (let step = 0; step < 11; step++) {
				await userEvent.keyboard('{ArrowUp}')

				await frames()

				expectClear(scroll, writes)
			}
		})

		it(`lands a far jump clear of the sticky chrome, ${label}`, async () => {
			const { scroll, writes } = renderGrid({ newRow })

			await waitFor(() => expect(scroll.querySelector('tr[data-row-index="0"]')).not.toBeNull())

			screen.getByRole('grid').focus()

			await userEvent.keyboard('{ArrowDown}')

			writes.length = 0

			for (const key of ['{Control>}{End}{/Control}', '{Control>}{Home}{/Control}', '{PageDown}']) {
				await userEvent.keyboard(key)

				await frames()

				await frames()

				expectClear(scroll, writes)
			}
		})
	}
})
