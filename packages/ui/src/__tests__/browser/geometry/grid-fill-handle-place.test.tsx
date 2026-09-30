import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, waitFor } from '../../helpers'

/**
 * The place of the fill handle (real browser). One overlay next to the table
 * shows the handle, and the grid places the overlay on the active cell. The
 * handle must sit on the bottom end corner of the cell, as it did when the cell
 * held it, through a move of the cursor, a scroll, and a change of the column
 * widths. The cell must keep its layout, so a move of the cursor does not
 * change the layout of the table.
 */
describe('grid fill handle place (real browser)', () => {
	type Row = { id: number; name: string; a: string; b: string; c: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'a', title: 'A', field: 'a', cell: (row) => row.a },
		{ id: 'b', title: 'B', field: 'b', cell: (row) => row.b },
		{ id: 'c', title: 'C', field: 'c', cell: (row) => row.c },
	]

	const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		a: `A${i}`,
		b: `B${i}`,
		c: `C${i}`,
	}))

	const cellSelector = (key: number, column: string) =>
		`tr[data-grid-row="${key}"] td[data-grid-col="${column}"]`

	const cell = (key: number, column: string) =>
		present(
			document.querySelector<HTMLElement>(cellSelector(key, column)),
			cellSelector(key, column),
		)

	const handle = () =>
		present(
			document.querySelector<HTMLElement>('[data-slot="grid-fill-handle"]'),
			'[data-slot="grid-fill-handle"]',
		)

	/**
	 * Expects the handle on the bottom end corner of the padding box of the cell,
	 * where an absolute child of the cell sits.
	 */
	const expectOnCorner = (target: HTMLElement, rtl = false) => {
		const box = target.getBoundingClientRect()

		const left = box.left + target.clientLeft

		const bottom = box.top + target.clientTop + target.clientHeight

		const end = rtl ? left : left + target.clientWidth

		const rect = handle().getBoundingClientRect()

		expect(rtl ? rect.left : rect.right).toBeCloseTo(end, 0)

		expect(rect.bottom).toBeCloseTo(bottom, 0)
	}

	const sizing = (a: number) => ({ value: { name: 160, a, b: 200, c: 200 } })

	const view = (a: number, dir?: 'rtl') => (
		<div dir={dir} style={{ width: '420px' }}>
			<Grid
				header={{ position: 'sticky' }}
				maxHeight="200px"
				columns={
					dir
						? columns
						: columns.map((col) => (col.id === 'name' ? { ...col, pinned: 'left' } : col))
				}
				columnSizing={sizing(a)}
				rows={rows}
				getKey={(row) => row.id}
				range
				editable={{ session: 'managed', onCommit: vi.fn() }}
			/>
		</div>
	)

	it('follows the cursor, and leaves the layout of the cell alone', async () => {
		renderUI(view(200))

		await userEvent.click(cell(2, 'a'))

		await waitFor(() => expectOnCorner(cell(2, 'a')))

		const children = cell(3, 'a').childElementCount

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expectOnCorner(cell(3, 'a')))

		expect(cell(3, 'a').childElementCount).toBe(children)

		expect(getComputedStyle(cell(3, 'a')).position).toBe('static')

		await userEvent.keyboard('{ArrowRight}')

		await waitFor(() => expectOnCorner(cell(3, 'b')))
	})

	it('does not read a fitting active cell as clipped', async () => {
		renderUI(view(200))

		await userEvent.click(cell(2, 'a'))

		await userEvent.hover(cell(2, 'a'))

		await waitFor(() => expectOnCorner(cell(2, 'a')))

		// A clipped cell wraps its content in the trigger of a truncation tooltip.
		expect(cell(2, 'a').querySelector('[data-slot="tooltip-trigger"]')).toBeNull()
	})

	it('scrolls with its cell, and stays on a pinned cell', async () => {
		renderUI(view(200))

		const scroller = present(
			document.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		await userEvent.click(cell(2, 'b'))

		scroller.scrollTo({ left: 120, top: 40 })

		await waitFor(() => expect(scroller.scrollLeft).toBe(120))

		expectOnCorner(cell(2, 'b'))

		await userEvent.click(cell(4, 'name'))

		await waitFor(() => expectOnCorner(cell(4, 'name')))

		scroller.scrollTo({ left: 200 })

		await waitFor(() => expect(scroller.scrollLeft).toBe(200))

		await waitFor(() => expectOnCorner(cell(4, 'name')))
	})

	it('follows its cell when a column to its start grows', async () => {
		const { rerender } = renderUI(view(120))

		await userEvent.click(cell(2, 'b'))

		await waitFor(() => expectOnCorner(cell(2, 'b')))

		rerender(view(180))

		await waitFor(() => expect(cell(2, 'a').getBoundingClientRect().width).toBeCloseTo(180, 0))

		await waitFor(() => expectOnCorner(cell(2, 'b')))
	})

	it('sits on the bottom left corner in a right-to-left grid', async () => {
		renderUI(view(200, 'rtl'))

		await userEvent.click(cell(2, 'a'))

		await waitFor(() => expectOnCorner(cell(2, 'a'), true))
	})
})
