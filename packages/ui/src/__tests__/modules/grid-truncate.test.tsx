import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

// Behavioural truncation + tooltip (overflow detection, hover) needs real
// layout and the floating engine — see the browser suite
// (grid-cell-truncate-tooltip). These cover the structural wiring jsdom can see.
describe('Grid cell truncation', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('wraps cell content in a truncating element by default', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const cell = container.querySelector('td[data-grid-col="name"]')

		expect(cell?.querySelector('span.truncate')).not.toBeNull()

		expect(cell).toHaveTextContent('Alice')
	})

	it('renders content unwrapped when truncate is false', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} truncate={false} />,
		)

		const cell = container.querySelector('td[data-grid-col="name"]')

		expect(cell?.querySelector('span.truncate')).toBeNull()

		expect(cell).toHaveTextContent('Alice')
	})

	it('leaves an empty cell unwrapped', () => {
		const sparse: GridColumn<Row>[] = [{ id: 'name', title: 'Name' }]

		const { container } = renderUI(<Grid columns={sparse} rows={rows} getKey={getKey} />)

		const cell = container.querySelector('td[data-grid-col="name"]')

		expect(cell?.querySelector('span.truncate')).toBeNull()
	})
})

// The overflow tooltip itself needs real layout (see the browser suite,
// grid-header-truncate-tooltip); these cover the structural wiring jsdom sees.
describe('Grid header truncation', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('wraps a sortable column title in a truncating element inside the sort button', () => {
		const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const header = container.querySelector('th[data-grid-col="name"]')

		const title = header?.querySelector('button span.truncate')

		expect(title).not.toBeNull()

		expect(title).toHaveTextContent('Name')
	})

	it('wraps a non-sortable column title in a truncating element', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', sortable: false, cell: (row) => row.name },
		]

		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const header = container.querySelector('th[data-grid-col="name"]')

		// No sort button when the column opts out of sorting, but the title still truncates.
		expect(header?.querySelector('button')).toBeNull()

		expect(header?.querySelector('span.truncate')).not.toBeNull()

		expect(header).toHaveTextContent('Name')
	})
})
