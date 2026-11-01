import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Textarea } from '../../../components/textarea'
import { Grid, type GridColumn, type GridProps } from '../../../modules/grid'
import { present, renderUI, waitFor } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'
import { gridCell } from '../../helpers/grid-cells'

/**
 * A text area in an `editCell` slot, on the real floating engine. In the cell
 * it shows one line, so the row keeps its height. With focus, it grows past
 * the cell when its text has more than one line or a line is wider than the
 * cell. It covers the cell from its top edge and grows down. Near the bottom
 * of the scroll area it covers the cell from its bottom edge and grows up, to
 * the head at most. A long line wraps at 28rem.
 */
beforeAll(() => page.viewport(1280, 900))

type Row = { id: number; name: string; notes: string }

const TWO_LINES = 'First line\nSecond line'

const rows: Row[] = [
	{ id: 1, name: 'Alice', notes: TWO_LINES },
	{ id: 2, name: 'Bruno', notes: 'Short' },
	{ id: 3, name: 'Chloe', notes: 'Short' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', width: '160px', cell: (row) => row.name },
	{
		id: 'notes',
		title: 'Notes',
		field: 'notes',
		width: '160px',
		cell: (row) => row.notes,
		editCell: ({ value, onValueUpdate, ariaLabel }) => (
			<Textarea
				aria-label={ariaLabel}
				rows={1}
				autoResize
				value={String(value ?? '')}
				onChange={(event) => onValueUpdate(event.target.value)}
			/>
		),
	},
]

const getSlot = (cell: HTMLElement) =>
	present<HTMLElement>(cell.querySelector('[data-slot="grid-edit-slot"]'), 'the editor slot')

const getRow = (cell: HTMLElement) => present(cell.closest('tr'), 'the row')

/** Opens the text area of `cell` under a cell-scoped session, with focus in it. */
const openNotes = vi.defineHelper(async (cell: HTMLElement) => {
	await userEvent.dblClick(cell)

	const textarea = await waitFor(() =>
		present<HTMLTextAreaElement>(cell.querySelector('textarea'), 'the text area'),
	)

	await waitFor(() => expect(document.activeElement).toBe(textarea))

	return textarea
})

/**
 * Renders the grid with a cell-scoped session unless `props` sets another. The
 * box gives each column a width that is less than 28rem.
 */
function renderGrid(props: Partial<GridProps<Row>> = {}) {
	return renderUI(
		<div style={{ width: 640 }}>
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
				{...props}
			/>
		</div>,
	)
}

describe('grid text area editor grow (real floating engine)', () => {
	it('shows one line in the cell, so the row keeps its height', async () => {
		const { container } = renderGrid({ editable: { session: 'managed', onCommit: () => {} } })

		const cell = gridCell(container, 'notes')

		const rowHeight = getRow(cell).getBoundingClientRect().height

		// Row scope opens each editor of the row. The entry names the name cell,
		// so the text area has no focus.
		await userEvent.dblClick(gridCell(container, 'name'))

		const textarea = await waitFor(() =>
			present<HTMLTextAreaElement>(cell.querySelector('textarea'), 'the text area'),
		)

		const input = present<HTMLInputElement>(
			gridCell(container, 'name').querySelector('input'),
			'the name input',
		)

		expect(getSlot(cell).hasAttribute('data-grown')).toBe(false)

		expect(textarea.getBoundingClientRect().height).toBeNear(
			input.getBoundingClientRect().height,
			PIXEL,
		)

		expect(getRow(cell).getBoundingClientRect().height).toBeNear(rowHeight, PIXEL)
	})

	it('grows down to show each line, and goes back into the cell as focus leaves', async () => {
		const { container } = renderGrid()

		const cell = gridCell(container, 'notes')

		const rowHeight = getRow(cell).getBoundingClientRect().height

		const textarea = await openNotes(cell)

		const slot = getSlot(cell)

		await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(true))

		const box = slot.getBoundingClientRect()

		const cellBox = cell.getBoundingClientRect()

		expect(box.top).toBeNear(cellBox.top, PIXEL)

		expect(box.left).toBeNear(cellBox.left, PIXEL)

		// Each line fits the width of the cell, so the editor keeps that width.
		expect(box.width).toBeNear(cellBox.width, PIXEL)

		expect(box.height).toBeGreaterThan(cellBox.height)

		// The text area shows each line, so it does not scroll.
		expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1)

		expect(getRow(cell).getBoundingClientRect().height).toBeNear(rowHeight, PIXEL)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(cell.querySelector('textarea')).toBeNull())

		expect(getRow(cell).getBoundingClientRect().height).toBeNear(rowHeight, PIXEL)
	})

	it('keeps Enter in the text area, and grows with each new line', async () => {
		const onCommit = vi.fn()

		const { container } = renderGrid({
			editable: { session: 'managed', scope: 'cell', onCommit },
		})

		const cell = gridCell(container, 'notes', 1)

		const textarea = await openNotes(cell)

		const slot = getSlot(cell)

		expect(slot.hasAttribute('data-grown')).toBe(false)

		await userEvent.keyboard('{End}{Enter}More')

		await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(true))

		expect(textarea.value).toBe('Short\nMore')

		expect(onCommit).not.toHaveBeenCalled()

		const height = slot.getBoundingClientRect().height

		await userEvent.keyboard('{Enter}Again')

		await waitFor(() => expect(slot.getBoundingClientRect().height).toBeGreaterThan(height))
	})

	it('wraps a long line at 28rem', async () => {
		const { container } = renderGrid()

		const cell = gridCell(container, 'notes', 1)

		const textarea = await openNotes(cell)

		await userEvent.keyboard(`{End}${' and more words'.repeat(6)}`)

		const slot = getSlot(cell)

		const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

		await waitFor(() => expect(slot.getBoundingClientRect().width).toBeNear(28 * rem, PIXEL))

		// The line wraps, so the editor grows down.
		await waitFor(() =>
			expect(slot.getBoundingClientRect().height).toBeGreaterThan(
				cell.getBoundingClientRect().height,
			),
		)

		expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1)
	})

	it('grows up from the last row, to the head at most', async () => {
		const { container } = renderGrid()

		const cell = gridCell(container, 'notes', 2)

		await openNotes(cell)

		await userEvent.keyboard('{End}{Enter}2{Enter}3{Enter}4{Enter}5{Enter}6{Enter}7')

		const slot = getSlot(cell)

		await waitFor(() => expect(slot.hasAttribute('data-grown')).toBe(true))

		const head = present(container.querySelector('thead'), 'the head')

		await waitFor(() =>
			expect(slot.getBoundingClientRect().bottom).toBeNear(
				cell.getBoundingClientRect().bottom,
				PIXEL,
			),
		)

		const box = slot.getBoundingClientRect()

		expect(box.height).toBeGreaterThan(cell.getBoundingClientRect().height)

		expect(box.top).toBeGreaterThanOrEqual(head.getBoundingClientRect().bottom - PIXEL)

		// The text is taller than the space under the head, so it scrolls in the
		// editor, and the caret line shows.
		expect(slot.scrollHeight).toBeGreaterThan(slot.clientHeight)
	})
})
