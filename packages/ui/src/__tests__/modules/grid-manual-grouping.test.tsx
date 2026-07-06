import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridGroupHeaderRow } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

/**
 * Server-side (manual) row grouping (`groupBy.manual` + the `groupRow` row
 * contract): the backend groups, and `rows` is the rendered sequence — group
 * headers carrying counts and aggregates, interleaved with the children of
 * expanded groups. Expansion is a controlled key set whose expand toggles fire
 * the `onGroupExpand` lazy-load hook, and the `panel` flag surfaces the group
 * panel whose affordances emit through `onValueChange`. The manual mode stands
 * the cursor / virtualization / total rows down, tested elsewhere by absence.
 */
describe('Grid manual (server-side) row grouping', () => {
	type Sale = {
		id: string
		region: string
		rep?: string
		revenue: number
		/** Present on backend group-header rows: the group key and its child count. */
		group?: { key: string; count: number }
	}

	// The row contract: a backend group row carries its descriptor, a leaf doesn't.
	const groupRow = (row: Sale): GridGroupHeaderRow | null =>
		row.group ? { key: row.group.key, value: row.region, count: row.group.count } : null

	// Header rows carry the backend's aggregate in the same field the column reads.
	const westHeader: Sale = {
		id: 'g:west',
		region: 'West',
		revenue: 7800,
		group: { key: 'west', count: 3 },
	}

	const eastHeader: Sale = {
		id: 'g:east',
		region: 'East',
		revenue: 9360,
		group: { key: 'east', count: 2 },
	}

	const westChildren: Sale[] = [
		{ id: 'w1', region: 'West', rep: 'Wade', revenue: 1440 },
		{ id: 'w2', region: 'West', rep: 'Tanya', revenue: 4200 },
		{ id: 'w3', region: 'West', rep: 'Tom', revenue: 2160 },
	]

	const eastChildren: Sale[] = [
		{ id: 'e1', region: 'East', rep: 'Devon', revenue: 2860 },
		{ id: 'e2', region: 'East', rep: 'Arlene', revenue: 6500 },
	]

	const columns: GridColumn<Sale>[] = [
		{
			id: 'region',
			title: 'Region',
			groupable: true,
			cell: (row) => row.region,
			value: (row) => row.region,
		},
		{ id: 'rep', title: 'Rep', cell: (row) => row.rep ?? '', value: (row) => row.rep },
		{
			id: 'revenue',
			title: 'Revenue',
			cell: (row) => String(row.revenue),
			value: (row) => row.revenue,
			aggFunc: 'sum',
			aggCell: ({ value }) => `$${String(value)}`,
		},
	]

	const getKey = (row: Sale) => row.id

	// A leaf row's `<tr>`, found by its cell text — a collapsed group keeps its
	// children mounted (hidden via `aria-hidden`) rather than unmounting them.
	function leafRow(text: string) {
		return screen.getByText(text).closest('tr')
	}

	it('emits the grouped column when a groupable header affordance is pressed', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={westChildren}
				getKey={getKey}
				groupBy={{ manual: true, value: null, onValueChange, groupRow, panel: true }}
			/>,
		)

		// Ungrouped: the panel invites a drop, and only the groupable column offers
		// the affordance.
		expect(screen.getByText('Drag a column here to group its rows')).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Group rows by Rep' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Group rows by Region' }))

		expect(onValueChange).toHaveBeenCalledWith('region')
	})

	it('shows the active group as a panel chip whose remove button ungroups', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={[westHeader, eastHeader]}
				getKey={getKey}
				groupBy={{ manual: true, value: 'region', onValueChange, groupRow, panel: true }}
			/>,
		)

		// The active column's header affordance stands down; the chip owns the state.
		expect(screen.queryByRole('button', { name: 'Group rows by Region' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Ungroup Region' }))

		expect(onValueChange).toHaveBeenCalledWith(null)
	})

	it('renders backend headers with counts and aggregates, hiding a collapsed group’s children', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={[westHeader, ...westChildren, eastHeader, ...eastChildren]}
				getKey={getKey}
				grandTotalRow="bottom"
				groupBy={{
					manual: true,
					value: 'region',
					groupRow,
					expanded: new Set(['west']),
				}}
			/>,
		)

		// Headers read the backend's child counts, not a client computation.
		expect(screen.getByText('West (3)')).toBeInTheDocument()

		expect(screen.getByText('East (2)')).toBeInTheDocument()

		// Each header's aggregate cell reads the backend figure off the group row.
		expect(screen.getByText('$7800')).toBeInTheDocument()

		expect(screen.getByText('$9360')).toBeInTheDocument()

		// Only the expanded group's children show; the collapsed group's stay
		// mounted but hidden.
		expect(leafRow('Wade')).not.toHaveAttribute('aria-hidden')

		expect(leafRow('Devon')).toHaveAttribute('aria-hidden', 'true')

		// The grand-total row stands down under manual grouping — the engine would
		// sum the group-header rows as data.
		expect(screen.queryByText('Total')).not.toBeInTheDocument()
	})

	it('treats expansion as controlled state, reporting toggles without mutating it', async () => {
		const user = userEvent.setup()

		const onExpandedChange = vi.fn()

		const onGroupExpand = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={[westHeader, ...westChildren, eastHeader]}
				getKey={getKey}
				groupBy={{
					manual: true,
					value: 'region',
					groupRow,
					expanded: new Set(['west']),
					onExpandedChange,
					onGroupExpand,
				}}
			/>,
		)

		// Collapsing an open group reports the shrunk set; the lazy-load hook
		// stays silent (its children are already there).
		await user.click(screen.getByRole('button', { name: 'Collapse group West' }))

		expect(onExpandedChange).toHaveBeenCalledWith(new Set())

		expect(onGroupExpand).not.toHaveBeenCalled()

		// The set is controlled: with no write-back the group stays open.
		expect(screen.getByRole('button', { name: 'Collapse group West' })).toBeInTheDocument()

		// Expanding a closed group reports the grown set and fires the lazy-load hook.
		await user.click(screen.getByRole('button', { name: 'Expand group East' }))

		expect(onExpandedChange).toHaveBeenCalledWith(new Set(['west', 'east']))

		expect(onGroupExpand).toHaveBeenCalledWith('east')
	})

	it('lazily inserts a group’s children fetched on expand', async () => {
		const user = userEvent.setup()

		function Harness() {
			const [rows, setRows] = useState<Sale[]>([westHeader, eastHeader])

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					groupBy={{
						manual: true,
						value: 'region',
						groupRow,
						// Stand-in for the async child fetch: splice the group's children
						// in after its header once it expands.
						onGroupExpand: (key) => {
							if (key !== 'west') return

							setRows((prev) => {
								const at = prev.indexOf(westHeader) + 1

								return [...prev.slice(0, at), ...westChildren, ...prev.slice(at)]
							})
						},
					}}
				/>
			)
		}

		renderUI(<Harness />)

		// Headers alone — no children loaded yet, and no empty slot in their place.
		expect(screen.getByText('West (3)')).toBeInTheDocument()

		expect(screen.queryByText('Wade')).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Expand group West' }))

		// The fetched children landed under their header, visible.
		expect(leafRow('Wade')).not.toHaveAttribute('aria-hidden')

		expect(leafRow('Tanya')).not.toHaveAttribute('aria-hidden')

		// The other group is untouched and still childless.
		expect(screen.queryByText('Devon')).not.toBeInTheDocument()
	})
})
