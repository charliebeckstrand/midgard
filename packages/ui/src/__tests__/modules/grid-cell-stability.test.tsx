import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * The flat and the grouped body both call each column's `cell(row)` inline, so a
 * cell's content is plain elements under the grid's own cell. A fresh `columns`
 * array (consumers often pass one inline) therefore reconciles the content in
 * place instead of remounting it, which would drop editor focus and selection.
 * This guards that stability for the read-only grid; the editable commit path is
 * covered by grid-editing.
 */
describe('Grid cell stability across column-array changes', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it.each([
		['flat', undefined],
		['grouped', { value: 'name' }],
	])('reconciles a %s cell in place when the columns array identity changes', (_, groupBy) => {
		function Harness() {
			const [, setTick] = useState(0)

			// A fresh columns array on every render, as a consumer that builds it
			// inline passes.
			const columns: GridColumn<Row>[] = [
				{ id: 'name', title: 'Name', cell: (row) => <span data-testid="inner">{row.name}</span> },
			]

			return (
				<>
					<button type="button" onClick={() => setTick((tick) => tick + 1)}>
						Rerender
					</button>

					<Grid columns={columns} rows={rows} getKey={getKey} groupBy={groupBy} />
				</>
			)
		}

		const { container } = renderUI(<Harness />)

		const before = container.querySelector('[data-testid="inner"]')

		expect(before).not.toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'Rerender' }))

		// Same DOM node: the content reconciled rather than remounting.
		expect(container.querySelector('[data-testid="inner"]')).toBe(before)
	})
})

describe('Grid grouped rows across a selection toggle', () => {
	type Row = { id: number; name: string; team: string }

	const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		team: `Team ${i % 3}`,
	}))

	it('renders only the leaf whose selection changed', () => {
		let calls = 0

		const columns: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{
				id: 'name',
				title: 'Name',
				cell: (row) => {
					calls++

					return row.name
				},
			},
			{ id: 'team', title: 'Team', cell: (row) => row.team },
		]

		renderUI(
			<Grid columns={columns} rows={rows} getKey={(row) => row.id} groupBy={{ value: 'team' }} />,
		)

		calls = 0

		fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }))

		// The other 29 leaves keep their props, so their memo holds.
		expect(calls).toBe(1)
	})
})

describe('Grid plain rows across a sort', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Name ${20 - i}` }))

	function setup(navigable: boolean) {
		let calls = 0

		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', sortable: true, cell: (row) => row.name },
			{
				id: 'actions',
				actions: (row) => {
					calls++

					return <button type="button">Edit {row.name}</button>
				},
			},
		]

		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={(row) => row.id} navigable={navigable} />,
		)

		calls = 0

		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

		const first = container.querySelector('tbody tr')

		return { calls, first: first?.textContent }
	}

	// A plain row reads no place, so a sort moves each row with its memo held.
	it('moves each row and renders none', () => {
		const { calls, first } = setup(false)

		expect(first).toMatch(/^Name 1\D/)

		expect(calls).toBe(0)
	})

	// Under grid semantics each row takes its new `aria-rowindex`, so it renders.
	it('renders each row of a navigable grid', () => {
		const { calls, first } = setup(true)

		expect(first).toMatch(/^Name 1\D/)

		expect(calls).toBe(rows.length)
	})
})
