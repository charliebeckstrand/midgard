import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'

/**
 * The commit on leave (`editable.commitOn`) with real focus moves. A click
 * outside the grid moves focus to the page body, and a click on a cell moves
 * it to the grid's tab stop. Shift+Tab from the tab stop leaves the grid. jsdom
 * moves focus only where a test calls `focus()`, so these moves need a real
 * browser.
 */
describe('grid commit on leave (real browser)', () => {
	type Row = { id: number; name: string; note: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', note: 'first' },
		{ id: 2, name: 'Bob', note: 'second' },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (r) => r.name },
		{ id: 'note', title: 'Note', field: 'note', cell: (r) => r.note, readOnly: true },
	]

	function renderGrid(editable: Partial<GridEditableConfig>) {
		const onCommit = vi.fn()

		const view = renderUI(
			<>
				<button type="button">Before</button>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(r) => r.id}
					editable={{ session: 'managed', scope: 'cell', onCommit, ...editable }}
				/>
				<p data-slot="outside-text">Text outside the grid</p>
			</>,
		)

		const cell = (col: string, row = 0) =>
			present(
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[row],
				`td[data-grid-col="${col}"]`,
			)

		return { ...view, onCommit, cell }
	}

	/** Opens the name cell of the first row and types `Alicia` over its value. */
	async function editName(view: ReturnType<typeof renderGrid>) {
		await userEvent.dblClick(view.cell('name'))

		expect(bySlot(view.container, 'grid-edit-input')).toHaveFocus()

		await userEvent.keyboard('{Control>}a{/Control}Alicia')
	}

	const alicia = [{ rowKey: 1, columnId: 'name', value: 'Alicia' }]

	it("commits on a click outside the grid under 'leaveGrid', and leaves focus there", async () => {
		const view = renderGrid({ commitOn: 'leaveGrid' })

		await editName(view)

		await userEvent.click(getSlot(view.container, 'outside-text'))

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()

		// The commit does not pull focus back into the grid.
		expect(screen.getByRole('grid')).not.toHaveFocus()
	})

	it("keeps the session on a click inside the grid under 'leaveGrid', and commits on Shift+Tab out", async () => {
		const view = renderGrid({ commitOn: 'leaveGrid' })

		await editName(view)

		// A click on a cell that is not editable moves focus to the tab stop.
		await userEvent.click(view.cell('note', 1))

		expect(screen.getByRole('grid')).toHaveFocus()

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(bySlot(view.container, 'grid-edit-input')).not.toBeNull()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus()

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)
	})

	it("commits on a click on another cell under 'leaveEditor', and keeps focus on the tab stop", async () => {
		const view = renderGrid({ commitOn: 'leaveEditor' })

		await editName(view)

		await userEvent.click(view.cell('note', 1))

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()

		expect(screen.getByRole('grid')).toHaveFocus()
	})

	it("discards on a press of discard under 'leaveEditor', with no commit first", async () => {
		const view = renderGrid({ commitOn: 'leaveEditor' })

		await editName(view)

		expect(screen.queryByRole('button', { name: 'Save Name, row 1' })).toBeNull()

		await userEvent.click(screen.getByRole('button', { name: 'Discard Name, row 1' }))

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()
	})
})
