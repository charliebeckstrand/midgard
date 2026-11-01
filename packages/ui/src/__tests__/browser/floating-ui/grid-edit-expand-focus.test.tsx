import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, waitFor, within } from '../../helpers'

type Row = { id: number; name: string; note: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', note: 'First' },
	{ id: 2, name: 'Bruno', note: 'Second' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'note', title: 'Note', field: 'note', cell: (row) => row.note },
	{
		id: 'actions',
		actions: (row, { expand }) => (
			<button type="button" onClick={expand}>
				{`expand-${row.id}`}
			</button>
		),
	},
]

/**
 * The form of an expanded row puts focus in the field of the cell in use on
 * the row, and gives focus back as it closes, on the real floating engine: to
 * the control that opened it, or to the grid with the cursor on the cell where
 * Shift+Enter opened it. The jsdom mock of the focus manager returns no focus.
 */
describe('grid row form focus (real floating engine)', () => {
	it('returns the focus to the expand control on Cancel', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const control = screen.getByRole('button', { name: 'expand-2' })

		await userEvent.click(control)

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveFocus())

		await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(control).toHaveFocus())
	})

	it('opens the form on the field of the cell that a double click opened', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		await userEvent.dblClick(within(grid).getByRole('gridcell', { name: 'Second' }))

		await waitFor(() => expect(within(grid).getByRole('textbox')).toHaveFocus())

		await userEvent.click(screen.getByRole('button', { name: 'expand-2' }))

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Note' })).toHaveFocus())
	})

	it('opens the form on the field of the cursor cell', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		await userEvent.click(within(grid).getByRole('gridcell', { name: 'Second' }))

		await userEvent.click(screen.getByRole('button', { name: 'expand-2' }))

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Note' })).toHaveFocus())
	})

	it('opens the form on the first field when the cursor is on another row', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		await userEvent.click(within(grid).getByRole('gridcell', { name: 'First' }))

		await userEvent.click(screen.getByRole('button', { name: 'expand-2' }))

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveFocus())
	})

	it('focuses the field of the cell again when a press takes the focus as the form opens', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		await userEvent.click(within(grid).getByRole('gridcell', { name: 'Second' }))

		// On iOS, the mouse events of the tap that opens the form come after the
		// field takes the focus, and the press takes the focus out to the body.
		const takeFocus = (event: FocusEvent) => {
			if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="dialog"]')) {
				return
			}

			document.removeEventListener('focusin', takeFocus)

			queueMicrotask(() => (document.activeElement as HTMLElement | null)?.blur())
		}

		document.addEventListener('focusin', takeFocus)

		await userEvent.click(screen.getByRole('button', { name: 'expand-2' }))

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Note' })).toHaveFocus())

		document.removeEventListener('focusin', takeFocus)
	})

	it('drops the cursor as the form opens, and leaves no active cell as it closes', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		await userEvent.click(within(grid).getByRole('gridcell', { name: 'Second' }))

		expect(grid.getAttribute('aria-activedescendant')).not.toBeNull()

		const control = screen.getByRole('button', { name: 'expand-2' })

		await userEvent.click(control)

		await screen.findByRole('dialog')

		await waitFor(() => expect(grid.getAttribute('aria-activedescendant')).toBeNull())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(control).toHaveFocus())

		expect(grid.getAttribute('aria-activedescendant')).toBeNull()

		expect(grid.querySelector('[role="gridcell"][data-active]')).toBeNull()
	})

	it('returns the focus to the cursor cell after Shift+Enter and Escape', async () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		const grid = screen.getByRole('grid')

		const cell = within(grid).getByRole('gridcell', { name: 'First' })

		await userEvent.click(cell)

		await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

		const sheet = await screen.findByRole('dialog')

		await waitFor(() => expect(within(sheet).getByRole('textbox', { name: 'Note' })).toHaveFocus())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(grid).toHaveFocus())

		expect(grid.getAttribute('aria-activedescendant')).toBe(cell.id)
	})
})
