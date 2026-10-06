import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, renderUI, screen, setupUser, waitFor } from '../helpers'

type Row = { id: number; name: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }))

const getKey = (row: Row) => row.id

/**
 * A new search or filter gives a new set of rows. An uncontrolled page then
 * starts again at the first page. A controlled page is the consumer's to move.
 */
describe('Grid page reset on a search', () => {
	it('returns an uncontrolled page to the first page when the search changes', async () => {
		const user = setupUser()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{}}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Next page' }))

		await user.click(screen.getByRole('button', { name: 'Next page' }))

		expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('3')

		// "Row 1" matches Row 1 and Row 10 to Row 19: eleven rows, three pages.
		await act(async () => {
			await user.type(screen.getByRole('searchbox'), 'Row 1')
		})

		// The search commits after its debounce.
		await waitFor(() =>
			expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('1'),
		)
	})

	it('leaves a controlled page to the consumer', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{}}
				pagination={{ value: { pageIndex: 1, pageSize: 5 }, onValueChange }}
			/>,
		)

		await act(async () => {
			await user.type(screen.getByRole('searchbox'), 'Row 1')
		})

		// Page 2 shows Row 6 to Row 10 before the search commits, and the fifth to
		// the ninth match after it: Row 14 to Row 18. Wait for the commit, so the
		// check below runs after the reset would have come.
		await waitFor(() => expect(screen.getByText('Row 14')).toBeInTheDocument())

		expect(screen.queryByText('Row 6')).not.toBeInTheDocument()

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
