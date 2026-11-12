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

		const body = [...container.querySelectorAll('tbody tr')]

		expect(body[0]?.textContent).toMatch(/^Name 1\D/)

		return { calls, places: body.map((tr) => tr.getAttribute('data-row-index')) }
	}

	// A plain row reads no place, so a sort moves each row with its memo held.
	it('moves each row and renders none', () => {
		const { calls, places } = setup(false)

		expect(calls).toBe(0)

		expect(new Set(places)).toEqual(new Set(['-1']))
	})

	// Under grid semantics the editing lookups resolve a row through its place.
	// The special cells read no place, so their memo holds.
	it('gives each row of a navigable grid its new place and renders no actions', () => {
		const { calls, places } = setup(true)

		expect(places).toEqual(rows.map((_, index) => String(index)))

		expect(calls).toBe(0)
	})
})

describe('Grid rows across a fresh array of the same columns', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	// The column sets no `sortable`, so the grid gives it the default, and a
	// fresh array that reached that step would give each cell a new column.
	it.each([
		['a plain grid', false],
		['a navigable grid', true],
	])('renders no cell in %s', (_, navigable) => {
		let calls = 0

		const columns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (row) => {
					calls++

					return row.name
				},
			},
		]

		function Harness() {
			const [, setTick] = useState(0)

			return (
				<>
					<button type="button" onClick={() => setTick((tick) => tick + 1)}>
						Rerender
					</button>

					<Grid columns={[...columns]} rows={rows} getKey={(row) => row.id} navigable={navigable} />
				</>
			)
		}

		renderUI(<Harness />)

		calls = 0

		fireEvent.click(screen.getByRole('button', { name: 'Rerender' }))

		expect(calls).toBe(0)
	})
})

describe('Grid body across a render of the grid', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const getKey = (row: Row) => row.id

	const expandable = { render: (row: Row) => `Details of ${row.name}` }

	// The body reads `rowClassName` for each row it renders, so a call counts a
	// render of the body. A fresh `tableProps` object, which a consumer often
	// passes inline, renders the grid again but changes no prop of the body.
	// jsdom renders no window, so the browser suite holds the windowed body.
	it.each([
		['a plain grid', {}],
		['a navigable grid', { navigable: true }],
		['a master-detail grid', { expandable }],
	])('renders no row in %s when only the table props change', (_, props) => {
		let calls = 0

		const rowClassName = () => {
			calls++

			return undefined
		}

		function Harness() {
			const [, setTick] = useState(0)

			return (
				<>
					<button type="button" onClick={() => setTick((tick) => tick + 1)}>
						Rerender
					</button>

					<Grid
						columns={columns}
						rows={rows}
						getKey={getKey}
						rowClassName={rowClassName}
						tableProps={{ 'aria-label': 'Names' }}
						{...props}
					/>
				</>
			)
		}

		renderUI(<Harness />)

		expect(calls).toBeGreaterThan(0)

		calls = 0

		fireEvent.click(screen.getByRole('button', { name: 'Rerender' }))

		expect(calls).toBe(0)
	})
})
