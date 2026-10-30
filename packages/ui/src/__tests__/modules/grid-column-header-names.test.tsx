import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

// A header with no title still names its column, so a screen reader does not
// announce an empty column header. The selection, drag-handle, and Add columns
// name themselves the same way.

type Row = { id: number; name: string }

const rows: Row[] = [{ id: 1, name: 'Alice' }]

const name: GridColumn<Row> = { id: 'name', title: 'Name', cell: (row) => row.name }

const getKey = (row: Row) => row.id

/** The accessible names of the column headers. */
function headerNames(): string[] {
	return screen.getAllByRole('columnheader').map((header) => header.textContent ?? '')
}

describe('a column header with no title', () => {
	it('names the expander column', () => {
		renderUI(
			<Grid
				columns={[{ id: 'expand', expander: true }, name]}
				rows={rows}
				getKey={getKey}
				expandable={{ render: (row) => row.name }}
			/>,
		)

		expect(headerNames()).toEqual(['Details', 'Name'])
	})

	it('names an actions column', () => {
		renderUI(
			<Grid
				columns={[name, { id: 'actions', actions: () => <button type="button">Edit</button> }]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expect(headerNames()).toEqual(['Name', 'Actions'])
	})

	it('keeps the title that an actions column gives', () => {
		renderUI(
			<Grid
				columns={[
					name,
					{ id: 'actions', title: 'Tools', actions: () => <button type="button">Edit</button> },
				]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expect(headerNames()).toEqual(['Name', 'Tools'])
	})
})
