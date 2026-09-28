import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Grid, type GridColumn } from '../../modules/grid'
import { densityStepOf, fireEvent, renderUI, screen } from '../helpers'

describe('Grid condensed', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('forces the compact padding step, overriding an explicit density', () => {
		renderUI(<Grid condensed size="lg" columns={columns} rows={rows} getKey={getKey} />)

		// The Table stamps the resolved density step; `condensed` wins over `loose`.
		expect(screen.getByRole('table').closest('[data-slot="table"]')).toHaveAttribute(
			'data-density',
			'sm',
		)
	})

	it('leaves density in charge when condensed is off', () => {
		renderUI(<Grid size="lg" columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('table').closest('[data-slot="table"]')).toHaveAttribute(
			'data-density',
			'lg',
		)
	})

	it('projects the cell-font step-down onto the table', () => {
		renderUI(<Grid condensed columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		expect(table).toHaveClass('[&>*>tr>td]:text-sm')

		expect(table).toHaveClass('[&>*>tr>th]:text-sm')
	})

	it('omits the projections on a plain grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('table')).not.toHaveClass('[&>*>tr>td]:text-sm')
	})

	it('gives cell content with no size the compact step of the table scope', () => {
		const withButton: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
		]

		renderUI(<Grid condensed columns={withButton} rows={rows} getKey={getKey} />)

		// A cell Button with no explicit `size` takes the `sm` step of the table
		// scope, not the ambient `md` step.
		expect(densityStepOf(screen.getByRole('button', { name: 'Edit Alice' }))).toBe('sm')
	})

	it('leaves cell content at the ambient size without condensed', () => {
		const withButton: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'actions', actions: (row) => <Button>Edit {row.name}</Button> },
		]

		renderUI(<Grid columns={withButton} rows={rows} getKey={getKey} />)

		expect(densityStepOf(screen.getByRole('button', { name: 'Edit Alice' }))).toBe('md')
	})

	it('leaves a portaled context menu at the ambient density, not the condensed step', () => {
		renderUI(
			<Grid condensed columns={columns} rows={rows} getKey={getKey} contextMenu={{ cell: true }} />,
		)

		fireEvent.contextMenu(screen.getByText('Alice'))

		// The menu portals from outside the table's condensed scope, so its nearest
		// scope is the ambient `md` step rather than the condensed `sm`. Text and icon
		// step together instead of the text alone shrinking.
		const item = screen.getByRole('menuitem', { name: 'Copy' })

		expect(densityStepOf(item)).toBe('md')
	})

	it('does not shrink a consumer badge outside the grid', () => {
		// The badge step-down is a table-scoped projection, so a badge elsewhere on
		// the page is untouched: the class lives on the grid's own `<table>`, and
		// the badge opens no density scope of its own.
		renderUI(
			<>
				<Badge>loose</Badge>
				<Grid condensed columns={columns} rows={rows} getKey={getKey} />
			</>,
		)

		expect(screen.getByText('loose')).not.toHaveAttribute('data-density')
	})
})
