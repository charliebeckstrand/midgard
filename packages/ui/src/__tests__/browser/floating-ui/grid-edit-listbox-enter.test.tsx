import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, renderUI, screen } from '../../helpers'

/**
 * Why the inline listbox editor has no Enter-to-commit, recorded as a test
 * rather than a comment: Enter on the closed trigger is how the listbox opens,
 * so there is no spare Enter for a session to commit with. Hoisting Enter onto
 * the grid table's key surface — the way Escape is hoisted — would contend with
 * this rather than fix it, which is what makes a visible settle control the
 * route to a keyboard commit for this editor (WCAG 2.1.1).
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
			view.container.querySelector('td[data-grid-col="done"]') as HTMLElement,
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

	it('reaches the settle control by keyboard, which is the commit Enter cannot be', async () => {
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
			view.container.querySelector('td[data-grid-col="done"]') as HTMLElement,
		)

		const trigger = await screen.findByRole('combobox')

		trigger.focus()

		// Tab walks forward out of the editor into the pair, in real tab order.
		await userEvent.tab()

		expect(screen.getByRole('button', { name: 'Save Done, row 1' })).toHaveFocus()

		await userEvent.keyboard('{Enter}')

		expect(bySlot(view.container, 'grid-edit-boolean-input')).toBeNull()
	})
})
