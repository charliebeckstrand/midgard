import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, present, renderUI, screen } from '../helpers'

/**
 * The toolbar's consumer slot: a narrowing the grid does not own, laid out on
 * the grid's own row across from the quick search rather than above the table.
 */
describe('Grid toolbar content', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('renders the consumer content beside the search', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{ placeholder: 'Find' }}
				toolbar={<button type="button">Region</button>}
			/>,
		)

		const bar = present(bySlot(container, 'grid-toolbar'), 'toolbar')

		// One row holding both, so the consumer's filter reads as a sibling of the
		// grid's own rather than as something about the surface around it.
		expect(bar).toContainElement(screen.getByPlaceholderText('Find'))

		expect(bar).toContainElement(screen.getByRole('button', { name: 'Region' }))
	})

	it('renders the row for the content alone', () => {
		// No search and no tools: without this the grid carries no toolbar at all,
		// and the content would have nowhere to go.
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				toolbar={<button type="button">Region</button>}
			/>,
		)

		expect(bySlot(container, 'grid-toolbar')).not.toBeNull()

		expect(screen.getByRole('button', { name: 'Region' })).toBeInTheDocument()
	})

	it('carries no toolbar when the consumer passes none', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// An unconfigured grid keeps its bare shape — no chrome, and no stray gap
		// above the table.
		expect(bySlot(container, 'grid-toolbar')).toBeNull()
	})
})
