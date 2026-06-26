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
