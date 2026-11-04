import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen, waitFor } from '../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bruno' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{
		id: 'actions',
		actions: (row) => (
			<button type="button" aria-label={`Edit ${row.name}`}>
				edit
			</button>
		),
	},
]

/** Whether the cell paints the 2px ring of the cursor. */
function ringed(cell: Element): boolean {
	return getComputedStyle(cell).boxShadow.includes('2px')
}

/**
 * The cursor's cell shows one ring. A control in the cell that shows its own
 * focus ring takes the place of the ring of the cell. A mouse press on a
 * button focuses it with no ring, so the cell keeps its ring. Real browser,
 * because `:focus-visible` and the rings need real input and real paint.
 */
describe('grid cursor ring (real browser)', () => {
	it('rings the cell of a button that a mouse press focuses', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} navigable />)

		const button = screen.getByRole('button', { name: 'Edit Bruno' })

		await userEvent.click(button)

		const cell = present(button.closest('td'), 'the cell of the button')

		await waitFor(() => expect(cell).toHaveAttribute('data-active'))

		expect(button.matches(':focus-visible')).toBe(false)

		expect(ringed(cell)).toBe(true)
	})

	it('gives the ring to a button that the keyboard focuses', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} navigable />)

		await userEvent.click(screen.getByRole('gridcell', { name: 'Bruno' }))

		await userEvent.keyboard('{ArrowRight}{F2}')

		const button = screen.getByRole('button', { name: 'Edit Bruno' })

		await waitFor(() => expect(button).toHaveFocus())

		expect(button.matches(':focus-visible')).toBe(true)

		expect(ringed(present(button.closest('td'), 'the cell of the button'))).toBe(false)
	})
})
