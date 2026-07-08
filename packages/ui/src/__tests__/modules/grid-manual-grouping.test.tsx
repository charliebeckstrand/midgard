import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridGroupHeaderRow } from '../../modules/grid'
import { MANUAL_GROUP_PLACEHOLDER_ROWS } from '../../modules/grid/grid-constants'
import { renderUI, screen, userEvent } from '../helpers'

/** The placeholder skeleton rows the grid draws under a loading manual group. */
function placeholderRows() {
	return document.querySelectorAll('[data-group-placeholder]')
}

/**
 * Server-side (manual) row grouping (`groupBy.manual` + the `groupRow` row
 * contract): the backend groups, and `rows` is the rendered sequence — group
 * headers carrying counts and aggregates, interleaved with the children of
 * expanded groups. Expansion is a controlled key set whose expand toggles fire
 * the `onGroupExpand` lazy-load hook, and the `groupButton` flag adds a per-column
 * header group-by button that toggles grouping through `onValueChange`. The manual
 * mode stands the cursor / virtualization / total rows down, tested elsewhere by
 * absence.
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

	it('emits the grouped column when a groupable header button is pressed', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={westChildren}
				getKey={getKey}
				groupBy={{ manual: true, value: null, onValueChange, groupRow, groupButton: true }}
			/>,
		)

		// Only the groupable column offers the button, named for the group action.
		expect(screen.queryByRole('button', { name: 'Group by Rep' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Group by Region' }))

		expect(onValueChange).toHaveBeenCalledWith('region')
	})

	it('flips the active column button to Ungroup and ungroups on a second press', async () => {
		const user = userEvent.setup()

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={[westHeader, eastHeader]}
				getKey={getKey}
				groupBy={{ manual: true, value: 'region', onValueChange, groupRow, groupButton: true }}
			/>,
		)

		// The active column's button stays put (unlike the old panel, which hid it)
		// but flips to a plain "Ungroup"; pressing it ungroups.
		expect(screen.queryByRole('button', { name: 'Group by Region' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Ungroup' }))

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

	it('sorts the groups by the grouped column, reordering whole group blocks', async () => {
		const user = userEvent.setup()

		// The grouped column made sortable — its header gains the sort toggle.
		const sortableColumns = columns.map((col) =>
			col.id === 'region' ? { ...col, sortable: true } : col,
		)

		renderUI(
			<Grid
				columns={sortableColumns}
				rows={[westHeader, ...westChildren, eastHeader, ...eastChildren]}
				getKey={getKey}
				groupBy={{ manual: true, value: 'region', groupRow, expanded: new Set(['west', 'east']) }}
			/>,
		)

		// True when `b` follows `a` in document order — so `a` leads `b`.
		const leads = (a: string, b: string) =>
			Boolean(
				screen.getByText(a).compareDocumentPosition(screen.getByText(b)) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			)

		// Backend order: the West block leads the East block.
		expect(leads('West (3)', 'East (2)')).toBe(true)

		// Ascending sort on Region reorders the blocks by value — East (E) leads West (W)…
		await user.click(screen.getByRole('button', { name: 'Sort by Region' }))

		expect(leads('East (2)', 'West (3)')).toBe(true)

		// …and each group's children move with it: West's leaf stays under West's header.
		expect(leads('West (3)', 'Wade')).toBe(true)

		// A second click flips to descending, restoring the West block ahead of East.
		await user.click(screen.getByRole('button', { name: 'Sort by Region' }))

		expect(leads('West (3)', 'East (2)')).toBe(true)
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

	it('opens a group instantly with skeleton placeholders while its children load', async () => {
		const user = userEvent.setup()

		function Harness() {
			const [expanded, setExpanded] = useState<Set<string | number>>(new Set())

			// onGroupExpand stands in for a fetch still in flight — no children arrive
			// synchronously, so the opened group has nothing to show but placeholders.
			return (
				<Grid
					columns={columns}
					rows={[westHeader, eastHeader]}
					getKey={getKey}
					groupBy={{
						manual: true,
						value: 'region',
						groupRow,
						expanded,
						onExpandedChange: setExpanded,
						onGroupExpand: () => {},
					}}
				/>
			)
		}

		renderUI(<Harness />)

		// Collapsed: nothing loading.
		expect(placeholderRows()).toHaveLength(0)

		await user.click(screen.getByRole('button', { name: 'Expand group West' }))

		// The group opened the same tick — its unfetched children are stood in for by
		// skeleton placeholder rows (West's count is 3, within the cap).
		expect(placeholderRows()).toHaveLength(Math.min(3, MANUAL_GROUP_PLACEHOLDER_ROWS))

		// East stays collapsed, so it contributes none.
		expect(screen.queryByRole('button', { name: 'Collapse group East' })).not.toBeInTheDocument()
	})

	it('caps placeholders for a large group and drops them once children arrive', () => {
		const bigHeader: Sale = {
			id: 'g:north',
			region: 'North',
			revenue: 1,
			group: { key: 'north', count: 50 },
		}

		const { rerender } = renderUI(
			<Grid
				columns={columns}
				rows={[bigHeader]}
				getKey={getKey}
				groupBy={{ manual: true, value: 'region', groupRow, expanded: new Set(['north']) }}
			/>,
		)

		// A 50-child group shows only the capped run of skeletons, never one per child.
		expect(placeholderRows()).toHaveLength(MANUAL_GROUP_PLACEHOLDER_ROWS)

		// The backend delivers the children → the placeholders give way to real rows.
		const child: Sale = { id: 'n1', region: 'North', rep: 'Ola', revenue: 10 }

		rerender(
			<Grid
				columns={columns}
				rows={[bigHeader, child]}
				getKey={getKey}
				groupBy={{ manual: true, value: 'region', groupRow, expanded: new Set(['north']) }}
			/>,
		)

		expect(placeholderRows()).toHaveLength(0)

		expect(screen.getByText('Ola')).toBeInTheDocument()
	})

	it('shows no placeholders for a collapsed group or one the backend reports empty', () => {
		const emptyHeader: Sale = {
			id: 'g:empty',
			region: 'Nowhere',
			revenue: 0,
			group: { key: 'nowhere', count: 0 },
		}

		renderUI(
			<Grid
				columns={columns}
				rows={[westHeader, emptyHeader]}
				getKey={getKey}
				// West collapsed; the empty group expanded but with a zero backend count.
				groupBy={{ manual: true, value: 'region', groupRow, expanded: new Set(['nowhere']) }}
			/>,
		)

		expect(placeholderRows()).toHaveLength(0)
	})
})
