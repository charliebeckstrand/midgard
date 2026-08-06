import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * A grid edit session's Escape against this library's own `Listbox` (real
 * floating engine). `sessionEscape` stands down while a floating surface is
 * open, so the first press closes the panel and the session survives it. The
 * jsdom suite cannot assert this: its `@floating-ui/react` mock renders
 * `FloatingPortal` inline and stamps no `data-floating-ui-portal`, so the guard
 * reads as missing there and the session looks like it dies on the first press.
 */
describe('grid edit session Escape vs an open listbox (real floating engine)', () => {
	type Row = { id: number; name: string; done: boolean }

	const rows: Row[] = [{ id: 1, name: 'Alice', done: false }]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (r) => r.name },
		{ id: 'done', title: 'Done', field: 'done', cell: (r) => (r.done ? 'Yes' : 'No') },
	]

	it('closes the open panel and keeps the session alive', async () => {
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

		await userEvent.click(trigger)

		await screen.findByRole('option', { name: 'Yes' })

		// The guard the session's Escape defers by. The jsdom suite mocks
		// `FloatingPortal` down to an inline render, so this attribute exists only
		// here — which is why the deferral can only be proven in this project.
		expect(document.querySelector('[data-floating-ui-portal]')).not.toBeNull()

		await userEvent.keyboard('{Escape}')

		// First Escape belongs to the panel; the editor must survive it.
		await waitFor(() => expect(screen.queryByRole('option', { name: 'Yes' })).toBeNull())

		expect(bySlot(view.container, 'grid-edit-boolean-input')).not.toBeNull()
	})
})
