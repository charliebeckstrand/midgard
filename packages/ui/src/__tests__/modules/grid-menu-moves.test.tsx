import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { GridColumnManager } from '../../modules/grid/grid-column-manager'
import { columnMenuItems } from '../../modules/grid/grid-context-menu-utilities'
import { GridRowManager } from '../../modules/grid/grid-row-manager'
import { intlEn } from '../../primitives/intl/intl-catalog'
import { expectAnnouncement, fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * The menu paths of a reorder and a resize, for a pointer that cannot drag
 * (WCAG 2.5.7). Each item commits through the callback of the drop or the key,
 * and the live region announces the result.
 */
describe('Grid menu moves and width steps', () => {
	type Row = { id: number; name: string; role: string; team: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
		{ id: 'team', title: 'Team', cell: (row) => row.team },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer', team: 'Core' },
		{ id: 2, name: 'Bob', role: 'Designer', team: 'Web' },
		{ id: 3, name: 'Carol', role: 'Manager', team: 'Ops' },
	]

	const getKey = (row: Row) => row.id

	const rightClick = (role: 'columnheader' | 'cell', name: string) => {
		const node = screen.getAllByRole(role).find((element) => element.textContent?.includes(name))

		if (!node) throw new Error(`no ${role} containing "${name}"`)

		fireEvent.contextMenu(node)
	}

	const item = (name: string) => screen.getByRole('menuitem', { name })

	const labels = () => screen.getAllByRole('menuitem').map((node) => node.textContent?.trim())

	describe('column menu Move items', () => {
		it('offers only the moves that change the place of the column', () => {
			renderUI(<Grid reorder columns={columns} rows={rows} getKey={getKey} />)

			rightClick('columnheader', 'Name')

			fireEvent.click(item('Move'))

			expect(labels()).toContain('Move right')

			expect(labels()).toContain('Move to end')

			expect(labels()).not.toContain('Move left')

			expect(labels()).not.toContain('Move to start')
		})

		it('moves the column through the column order and announces its place', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					reorder
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnOrder={{ onValueChange }}
				/>,
			)

			rightClick('columnheader', 'Name')

			fireEvent.click(item('Move'))

			fireEvent.click(item('Move right'))

			expect(onValueChange).toHaveBeenLastCalledWith(['role', 'name', 'team'])

			await expectAnnouncement('Name column moved to position 2 of 3.', 'assertive')

			rightClick('columnheader', 'Team')

			fireEvent.click(item('Move'))

			fireEvent.click(item('Move to start'))

			expect(onValueChange).toHaveBeenLastCalledWith(['team', 'role', 'name'])

			await expectAnnouncement('Team column moved to position 1 of 3.', 'assertive')
		})

		it('offers no Move item without reorder, or on a pinned column', () => {
			const { unmount } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

			rightClick('columnheader', 'Name')

			expect(screen.queryByRole('menuitem', { name: 'Move' })).not.toBeInTheDocument()

			unmount()

			const pinned = columns.map((column) =>
				column.id === 'name' ? { ...column, pinned: 'left' as const } : column,
			)

			renderUI(<Grid reorder columns={pinned} rows={rows} getKey={getKey} />)

			rightClick('columnheader', 'Name')

			expect(screen.queryByRole('menuitem', { name: 'Move' })).not.toBeInTheDocument()

			expect(screen.queryByRole('menuitem', { name: /^Move/ })).not.toBeInTheDocument()
		})

		it('names the physical side, so a right-to-left grid swaps left and right', () => {
			const run = vi.fn()

			const items = columnMenuItems({
				intl: intlEn,
				column: columns[1] as GridColumn<Row>,
				sort: [],
				sortDirection: undefined,
				sortColumn: vi.fn(),
				clearSort: vi.fn(),
				pinColumn: vi.fn(),
				groupBy: null,
				autoSizeColumns: null,
				autoSizeColumn: null,
				resetColumnWidths: null,
				chooseColumns: null,
				manageLabel: 'Manage columns',
				exportActions: [],
				filter: null,
				move: { targets: ['previous', 'next'], run },
				width: null,
				rtl: true,
			})

			const move = items.find((entry) => entry.key === 'move')

			const moves = move && 'items' in move ? (move.items ?? []) : []

			expect(moves.map((entry) => ('label' in entry ? entry.label : null))).toEqual([
				'Move right',
				'Move left',
			])
		})
	})

	describe('column menu Width items', () => {
		it('steps the width by the PageUp step and announces it', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					resizable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnSizing={{ defaultValue: { name: 200 }, onValueChange }}
				/>,
			)

			rightClick('columnheader', 'Name')

			fireEvent.click(item('Width'))

			fireEvent.click(item('Increase width'))

			await waitFor(() =>
				expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 264 })),
			)

			await expectAnnouncement('Name column 264 pixels')

			rightClick('columnheader', 'Name')

			fireEvent.click(item('Width'))

			fireEvent.click(item('Decrease width'))

			await waitFor(() =>
				expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 200 })),
			)

			await expectAnnouncement('Name column 200 pixels')
		})

		it('offers only the step that changes the width at a bound', () => {
			const bounded = columns.map((column) =>
				column.id === 'name' ? { ...column, minWidth: 120 } : column,
			)

			renderUI(
				<Grid
					resizable
					columns={bounded}
					rows={rows}
					getKey={getKey}
					columnSizing={{ defaultValue: { name: 120 } }}
				/>,
			)

			rightClick('columnheader', 'Name')

			// A lone step renders in place, not under a Width parent.
			expect(item('Increase width')).toBeInTheDocument()

			expect(screen.queryByRole('menuitem', { name: 'Decrease width' })).not.toBeInTheDocument()
		})

		it('offers no Width item when the grid is not resizable', () => {
			renderUI(<Grid resizable={false} columns={columns} rows={rows} getKey={getKey} />)

			rightClick('columnheader', 'Name')

			expect(screen.queryByRole('menuitem', { name: 'Width' })).not.toBeInTheDocument()
		})
	})

	describe('cell menu row moves', () => {
		const rowColumns: GridColumn<Row>[] = [{ id: 'drag', dragHandle: true }, ...columns]

		it('moves the row through onReorder and announces its place', async () => {
			const onReorder = vi.fn()

			renderUI(
				<Grid
					columns={rowColumns}
					rows={rows}
					getKey={getKey}
					rowLabel={(row) => row.name}
					rowReorder={{ onReorder }}
				/>,
			)

			rightClick('cell', 'Alice')

			expect(screen.queryByRole('menuitem', { name: 'Move up' })).not.toBeInTheDocument()

			fireEvent.click(item('Move down'))

			expect(onReorder).toHaveBeenCalledWith([rows[1], rows[0], rows[2]])

			await expectAnnouncement('Alice moved to position 2 of 3.', 'assertive')

			rightClick('cell', 'Carol')

			expect(screen.queryByRole('menuitem', { name: 'Move down' })).not.toBeInTheDocument()

			fireEvent.click(item('Move up'))

			expect(onReorder).toHaveBeenLastCalledWith([rows[0], rows[2], rows[1]])
		})

		it('offers no row move while the rows do not reorder', () => {
			renderUI(
				<Grid
					columns={rowColumns}
					rows={rows}
					getKey={getKey}
					rowReorder={{ onReorder: vi.fn(), disabled: true }}
				/>,
			)

			rightClick('cell', 'Alice')

			expect(screen.queryByRole('menuitem', { name: 'Move down' })).not.toBeInTheDocument()
		})
	})

	describe('column manager move control', () => {
		const items = [
			{ id: 'name', title: 'Name' },
			{ id: 'role', title: 'Role' },
			{ id: 'team', title: 'Team' },
		]

		it('moves a column through the order and announces its place', async () => {
			const onOrderChange = vi.fn()

			renderUI(<GridColumnManager columns={items} onOrderChange={onOrderChange} />)

			fireEvent.click(screen.getByRole('button', { name: 'Move Name' }))

			expect(labels()).toEqual(['Move down', 'Move to bottom'])

			fireEvent.click(item('Move to bottom'))

			expect(onOrderChange).toHaveBeenLastCalledWith(['role', 'team', 'name'])

			await expectAnnouncement('Name column moved to position 3 of 3.', 'assertive')
		})

		it('renders no move control on a read-only list', () => {
			renderUI(<GridColumnManager columns={items} reorderable={false} />)

			expect(screen.queryByRole('button', { name: 'Move Name' })).not.toBeInTheDocument()
		})
	})

	describe('row manager move control', () => {
		const alpha = { key: 'a', label: 'Alpha', count: 2 }

		const groups = [alpha, { key: 'b', label: 'Beta', count: 1 }]

		it('moves a group through onReorderGroups and announces its place', async () => {
			const onReorderGroups = vi.fn()

			renderUI(
				<GridRowManager groups={groups} onRecolor={vi.fn()} onReorderGroups={onReorderGroups} />,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Move Beta' }))

			expect(labels()).toEqual(['Move up', 'Move to top'])

			fireEvent.click(item('Move up'))

			expect(onReorderGroups).toHaveBeenCalledWith(['b', 'a'])

			await expectAnnouncement(/moved to position 1 of 2\./, 'assertive')
		})

		it('renders no move control on a lone group', () => {
			renderUI(<GridRowManager groups={[alpha]} onRecolor={vi.fn()} onReorderGroups={vi.fn()} />)

			expect(screen.queryByRole('button', { name: 'Move Alpha' })).not.toBeInTheDocument()
		})
	})
})
