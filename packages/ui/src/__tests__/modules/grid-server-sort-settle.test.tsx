import { useMemo, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type SortState } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

// The server-sort settle wash is projected from the `<table>` onto its data
// `<tbody>`, so assert against the table element's class list (a running
// animation / opacity is unreliable in jsdom — mirror `grid-sort.test.tsx`).
const PULSE = '[&>tbody:first-of-type]:motion-safe:animate-pulse'
const DIM = '[&>tbody:first-of-type]:motion-reduce:opacity-50'

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

	it('pulses and dims the rows while a server sort is in flight, clearing when the rows land', async () => {
		renderUI(<AsyncHarness />)

		// At rest — no sort in flight — the body carries neither the pulse nor the dim.
		expect(table().className).not.toContain(PULSE)

		expect(table().className).not.toContain(DIM)

		// Emitting the sort with no new rows yet marks the grid settling.
		sortByName()

		await waitFor(() => expect(table().className).toContain(PULSE))

		expect(table().className).toContain(DIM)

		// The reordered rows arriving settles the sort and clears the wash.
		fireEvent.click(screen.getByRole('button', { name: 'land' }))

		await waitFor(() => expect(table().className).not.toContain(PULSE))

		expect(table().className).not.toContain(DIM)
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

		// Give any settling effect a chance to run, then confirm the wash never applied.
		await waitFor(() => expect(screen.getByText('Charlie')).toBeTruthy())

		expect(table().className).not.toContain(PULSE)

		expect(table().className).not.toContain(DIM)
	})

	it('lifts the wash when a rapid asc→desc→clear settles back to the shown rows', async () => {
		// A server sort where an in-flight sort's reordered rows never arrive before
		// the next click. Clearing returns to the server's default order — which,
		// with nothing landed between the clicks, is the order already on screen, so
		// the consumer hands back the same `rows` reference. The grid must still read
		// the cleared sort as settled, not stay stuck mid-flight (the reported bug).
		function RapidHarness() {
			const [sort, setSort] = useState<SortState[]>([])

			const [rows, setRows] = useState(initialRows)

			const onValueChange = (next: SortState[]) => {
				setSort(next)

				// Non-empty sorts are in flight (their rows land later); clearing snaps
				// back to the default set already shown — an unchanged `rows` reference.
				if (next.length === 0) setRows(initialRows)
			}

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					sort={{ value: sort, onValueChange, manual: true }}
				/>
			)
		}

		renderUI(<RapidHarness />)

		// asc, then desc — each a server sort with no rows yet, so the body settles.
		sortByName()

		await waitFor(() => expect(table().className).toContain(PULSE))

		sortByName()

		expect(table().className).toContain(PULSE)

		// Clearing returns to unsorted, matching the rows already shown, so the wash
		// lifts. Before the fix it latched — pulsing on with no sort in flight.
		sortByName()

		await waitFor(() => expect(table().className).not.toContain(PULSE))

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
		// neither the pulse nor the dim — is projected onto the body.
		expect(table().className).not.toContain(PULSE)

		expect(table().className).not.toContain(DIM)
	})
})
