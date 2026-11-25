import '../setup/grid-modules'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

// A header takes its name from its title alone, and not from the names of the
// controls in it. A header with no title still names its column, so a screen
// reader does not announce an empty column header. The selection, drag-handle,
// and Add columns name themselves the same way.

type Row = { id: number; name: string }

const rows: Row[] = [{ id: 1, name: 'Alice' }]

const name: GridColumn<Row> = { id: 'name', title: 'Name', cell: (row) => row.name }

const getKey = (row: Row) => row.id

/** Asserts the accessible names of the column headers, in order. */
function expectHeaderNames(names: string[]): void {
	const headers = screen.getAllByRole('columnheader')

	expect(headers).toHaveLength(names.length)

	headers.forEach((header, index) => {
		expect(header).toHaveAccessibleName(names[index])
	})
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

		expectHeaderNames(['Details', 'Name'])
	})

	it('names an actions column', () => {
		renderUI(
			<Grid
				columns={[name, { id: 'actions', actions: () => <button type="button">Edit</button> }]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expectHeaderNames(['Name', 'Actions'])
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

		expectHeaderNames(['Name', 'Tools'])
	})

	it('names a data column with no title by its id', () => {
		// The title span holds the id as hidden text. An empty span would give
		// the header an empty name.
		renderUI(
			<Grid
				columns={[name, { id: 'score', sortable: true, cell: () => '1' }]}
				rows={rows}
				getKey={getKey}
			/>,
		)

		const [, score] = screen.getAllByRole('columnheader')

		expect(score).toHaveAccessibleName('score')
	})
})

describe('a column header with controls', () => {
	type Wide = Row & { revenue: number }

	const wideRows: Wide[] = [{ id: 1, name: 'Alice', revenue: 10 }]

	const nameColumn: GridColumn<Wide> = {
		id: 'name',
		title: 'Name',
		sortable: true,
		cell: (row) => row.name,
	}

	const revenue: GridColumn<Wide> = {
		id: 'revenue',
		title: 'Revenue',
		sortable: true,
		filterable: true,
		groupable: true,
		cell: (row) => row.revenue,
	}

	const columns = [nameColumn, revenue]

	it('takes its name from the title, not from its sort, filter, group, and resize controls', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={wideRows}
				getKey={getKey}
				resizable
				groupBy={{ value: null, onValueChange: () => {}, groupButton: true }}
			/>,
		)

		// The controls keep their own names.
		expect(screen.getByRole('button', { name: 'Sort by Revenue' })).toBeInTheDocument()

		expect(screen.getByRole('separator', { name: 'Resize Revenue' })).toBeInTheDocument()

		expectHeaderNames(['Name', 'Revenue'])
	})

	it('keeps the sort priority badge out of the name', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={wideRows}
				getKey={getKey}
				sort={{
					defaultValue: [
						{ column: 'name', direction: 'asc' },
						{ column: 'revenue', direction: 'desc' },
					],
				}}
			/>,
		)

		expectHeaderNames(['Name', 'Revenue'])
	})

	it('takes its name from the title in a reorderable header with a grip', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={wideRows}
				getKey={getKey}
				resizable
				reorder={{ handle: true }}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Reorder Revenue' })).toBeInTheDocument()

		expectHeaderNames(['Name', 'Revenue'])
	})

	it('takes its name from the title in a pinned header with an unpin button', () => {
		renderUI(
			<Grid
				columns={[{ ...nameColumn, pinned: 'left' }, revenue]}
				rows={wideRows}
				getKey={getKey}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Unpin Name' })).toBeInTheDocument()

		expectHeaderNames(['Name', 'Revenue'])
	})
})
