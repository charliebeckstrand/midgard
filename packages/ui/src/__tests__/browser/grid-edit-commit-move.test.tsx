import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, getSlot, present, renderUI, screen } from '../helpers'

/**
 * The commit-and-move keys with real key presses. The keys suppress the
 * browser's own default action, such as Tab's focus move, and type-to-edit
 * relies on where the caret lands. jsdom dispatches the event but performs
 * neither, so these focus and caret results need a real browser.
 */
describe('grid commit-and-move keys (real browser)', () => {
	type Row = { id: number; name: string; count: number }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', count: 2 },
		{ id: 2, name: 'Bob', count: 5 },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (r) => r.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (r) => String(r.count) },
	]

	function renderGrid() {
		const onCommit = vi.fn()

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		const cell = (col: string, row = 0) =>
			present(
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[row],
				`td[data-grid-col="${col}"]`,
			)

		return { ...view, onCommit, cell }
	}

	it('moves focus into the next editor on Tab, past the settle pair', async () => {
		const { container, cell, onCommit } = renderGrid()

		await userEvent.dblClick(cell('name'))

		await userEvent.keyboard('{Control>}a{/Control}Alicia')

		await userEvent.keyboard('{Tab}')

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The browser's own Tab would reach the save control beside the editor.
		// The key surface prevents it and moves the session instead.
		expect(bySlot(container, 'grid-edit-number-input')).toHaveFocus()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('moves focus into the editor one row down on Enter', async () => {
		const { container, cell } = renderGrid()

		await userEvent.dblClick(cell('name'))

		await userEvent.keyboard('{Enter}')

		const next = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		expect(next).toHaveFocus()

		expect(next.value).toBe('Bob')

		expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', cell('name', 1).id)
	})

	it('types into a cell from the tab stop, keeping each character it types', async () => {
		const { container, cell, onCommit } = renderGrid()

		await userEvent.click(cell('name'))

		expect(screen.getByRole('grid')).toHaveFocus()

		// The first key opens the editor with itself as the value. The rest land
		// in the editor after it, which holds only when the caret sits at the end.
		await userEvent.keyboard('Zoe')

		expect(getSlot<HTMLInputElement>(container, 'grid-edit-input').value).toBe('Zoe')

		await userEvent.keyboard('{F2}')

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Zoe' }])

		expect(screen.getByRole('grid')).toHaveFocus()
	})
})
