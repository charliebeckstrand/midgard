import { useMemo, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type SortState } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

// The server-sort settle wash is projected from the `<table>` onto its data
// `<tbody>`, so assert against the table element's class list (computed `:hover`
// / opacity is unreliable in jsdom — mirror `grid-sort.test.tsx`).
const TRANSITION = '[&>tbody:first-of-type]:transition-opacity'
const DIM = '[&>tbody:first-of-type]:opacity-50'

describe('Grid server-sort settle', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			sortable: true,
		},
	]

	const initialRows: Row[] = [
		{ id: 1, name: 'Charlie' },
		{ id: 2, name: 'Alice' },
		{ id: 3, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	const table = () => present(document.querySelector('table'), 'grid table')

	const sortByName = () => fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

	// Manual mode with an async row handoff: the sort change lands first, the
	// reordered rows a commit later — the interval the wash covers.
	function AsyncHarness() {
		const [sort, setSort] = useState<SortState[]>([])

		const [rows, setRows] = useState(initialRows)

		return (
			<>
				<button type="button" onClick={() => setRows((prev) => prev.slice())}>
					land
				</button>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					sort={{ value: sort, onValueChange: setSort, manual: true }}
				/>
			</>
		)
	}

	it('eases the data body whenever a manual sort is configured', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={initialRows}
				getKey={getKey}
				sort={{ value: [], onValueChange: () => {}, manual: true }}
			/>,
		)

		// The transition is present at rest so the wash fades both directions; the
		// dim itself is not, since no sort is in flight.
		expect(table().className).toContain(TRANSITION)

		expect(table().className).not.toContain(DIM)
	})

	it('dims the rows while a server sort is in flight, clearing when the rows land', async () => {
		renderUI(<AsyncHarness />)

		expect(table().className).not.toContain(DIM)

		// Emitting the sort with no new rows yet marks the grid settling.
		sortByName()

		await waitFor(() => expect(table().className).toContain(DIM))

		// The reordered rows arriving settles the sort and clears the wash.
		fireEvent.click(screen.getByRole('button', { name: 'land' }))

		await waitFor(() => expect(table().className).not.toContain(DIM))
	})

	it('never dims when the consumer swaps rows in the same commit as the sort', async () => {
		// A synchronous re-sort: the rows derive from the sort, so both change in one
		// commit and the grid settles at once — no dim flash.
		function SyncHarness() {
			const [sort, setSort] = useState<SortState[]>([])

			const rows = useMemo(() => (sort.length ? [...initialRows].reverse() : initialRows), [sort])

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					sort={{ value: sort, onValueChange: setSort, manual: true }}
				/>
			)
		}

		renderUI(<SyncHarness />)

		sortByName()

		// Give any settling effect a chance to run, then confirm the dim never applied.
		await waitFor(() => expect(screen.getByText('Charlie')).toBeTruthy())

		expect(table().className).not.toContain(DIM)
	})

	it('leaves a client-sorted grid untouched', () => {
		function ClientHarness() {
			const [sort, setSort] = useState<SortState[]>([])

			return (
				<Grid
					columns={columns}
					rows={initialRows}
					getKey={getKey}
					sort={{ value: sort, onValueChange: setSort }}
				/>
			)
		}

		renderUI(<ClientHarness />)

		sortByName()

		// Client sorting reorders in place with no round trip, so no settle wash —
		// neither the easing nor the dim — is projected onto the body.
		expect(table().className).not.toContain(TRANSITION)

		expect(table().className).not.toContain(DIM)
	})
})
