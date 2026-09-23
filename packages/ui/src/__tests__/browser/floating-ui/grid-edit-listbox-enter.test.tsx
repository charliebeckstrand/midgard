import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * Why the inline listbox editor has no Enter-to-commit, recorded as a test
 * rather than a comment: Enter on the closed trigger is how the listbox opens,
 * so there is no spare Enter for a session to commit with. The grid table's key
 * surface leaves Enter on a button to that button for this reason. Tab is the
 * keyboard commit this editor has instead, because the surface claims it to
 * commit and move (WCAG 2.1.1).
 */
describe('listbox editor and Enter (real floating engine)', () => {
	type Row = { id: number; done: boolean }

	const rows: Row[] = [{ id: 1, done: false }]

	const columns: GridColumn<Row>[] = [
		{ id: 'done', title: 'Done', field: 'done', cell: (r) => (r.done ? 'Yes' : 'No') },
	]

	it('gives Enter to the listbox, leaving no key to commit with', async () => {
		const onCommit = vi.fn()

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				editable={{ trigger: 'doubleClick', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.dblClick(
			present(view.container.querySelector('td[data-grid-col="done"]'), 'td[data-grid-col="done"]'),
		)

		const trigger = await screen.findByRole('combobox')

		trigger.focus()

		// Enter on the closed trigger: does the listbox take it?
		await userEvent.keyboard('{Enter}')

		const opened = screen.queryByRole('option', { name: 'Yes' }) !== null

		expect(opened).toBe(true)

		// And with Enter spent on opening, nothing has committed.
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('commits the listbox value on Tab, which Enter cannot do', async () => {
		const onCommit = vi.fn()

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(r) => r.id}
				editable={{ trigger: 'doubleClick', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.dblClick(
			present(view.container.querySelector('td[data-grid-col="done"]'), 'td[data-grid-col="done"]'),
		)

		const trigger = await screen.findByRole('combobox')

		trigger.focus()

		await userEvent.keyboard('{Enter}')

		await userEvent.click(await screen.findByRole('option', { name: 'Yes' }))

		await waitFor(() => expect(screen.queryByRole('option', { name: 'Yes' })).toBeNull())

		trigger.focus()

		// The column is the row's only editable one, so Tab has nowhere to move and
		// commits in place. The settle pair sits outside the tab order, so Tab
		// cannot land on it instead.
		await userEvent.keyboard('{Tab}')

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'done', value: true }])

		expect(bySlot(view.container, 'grid-edit-boolean-input')).toBeNull()

		expect(screen.getByRole('grid')).toHaveFocus()
	})
})
