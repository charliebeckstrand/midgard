import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * The yes/no listbox editor under `commitOn: 'leaveEditor'` (real floating
 * engine). Its options render in a portal outside the table's DOM. Focus that
 * moves into them reaches the table through the React tree, so the session
 * holds. An unrelated portal on the same page is not the editor's, and focus
 * that moves into it commits. The jsdom suite renders the portal inline, so
 * only this project can prove the difference.
 */
describe('grid commit on leave vs the listbox editor (real floating engine)', () => {
	type Row = { id: number; done: boolean }

	const rows: Row[] = [{ id: 1, done: false }]

	const columns: GridColumn<Row>[] = [
		{ id: 'done', title: 'Done', field: 'done', cell: (r) => (r.done ? 'Yes' : 'No') },
	]

	it('keeps the session through the options, and commits on a move to an unrelated portal', async () => {
		const onCommit = vi.fn()

		const view = renderUI(
			<>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(r) => r.id}
					editable={{ session: 'managed', scope: 'cell', commitOn: 'leaveEditor', onCommit }}
				/>
				<div data-floating-ui-portal="">
					<button type="button">Unrelated</button>
				</div>
			</>,
		)

		await userEvent.dblClick(
			present(view.container.querySelector<HTMLElement>('td[data-grid-col="done"]'), 'done'),
		)

		await userEvent.click(await screen.findByRole('combobox'))

		await userEvent.click(await screen.findByRole('option', { name: 'Yes' }))

		await waitFor(() => expect(screen.queryByRole('option', { name: 'Yes' })).toBeNull())

		// The pick went through the editor's own portal, so the session holds.
		expect(onCommit).not.toHaveBeenCalled()

		expect(bySlot(view.container, 'grid-edit-boolean-input')).not.toBeNull()

		await userEvent.click(screen.getByRole('button', { name: 'Unrelated' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'done', value: true }])
	})
})
