import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, fireEvent, present, renderUI, screen } from '../helpers'

type Row = { id: number; name: string }

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }))

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

/**
 * A selection outlives the page and the filter. Select-all adds the rows that
 * the grid shows, and deselect-all takes only those rows out.
 */
describe('Grid selection scope', () => {
	it('keeps the selection of another page through select-all and deselect-all', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{
					defaultValue: new Set<number>(),
					batchActions: ({ selection }) => <button type="button">Act on {selection.size}</button>,
				}}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		const selectPage = () =>
			fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }))

		selectPage()

		fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

		selectPage()

		expect(screen.getByRole('button', { name: 'Act on 10' })).toBeInTheDocument()

		// Deselect-all on page 2 takes out page 2 only.
		selectPage()

		expect(screen.getByRole('button', { name: 'Act on 5' })).toBeInTheDocument()
	})

	it('shows the batch actions for a selection that the view does not show', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{
					defaultValue: new Set<number>([1]),
					batchActions: ({ selection }) => <button type="button">Act on {selection.size}</button>,
				}}
				pagination={{ defaultValue: { pageIndex: 1, pageSize: 5 } }}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Act on 1' })).toBeInTheDocument()
	})

	it('names the selected rows that a search hides', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{ defaultValue: 'Row 1' }}
				selection={{ defaultValue: new Set<number>([1, 2, 3]) }}
				footer={{ selectedTotal: true }}
			/>,
		)

		// "Row 1" keeps Row 1 and Row 10. Rows 2 and 3 are selected and hidden.
		expect(present(bySlot(container, 'grid-footer-status'), 'the count region')).toHaveTextContent(
			'3 rows selected, 2 not shown',
		)
	})
})
