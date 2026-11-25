import '../setup/grid-modules'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { GridColumnManager } from '../../modules/grid/grid-column-manager'
import { columnMenuItems } from '../../modules/grid/grid-context-menu-utilities'
import { GridGroupManager } from '../../modules/grid/grid-group-manager'
import type { GridColumnGroup } from '../../modules/grid/grid-group-types'
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

	describe('group editor move control', () => {
		const items = [
			{ id: 'first', title: 'First' },
			{ id: 'last', title: 'Last' },
			{ id: 'email', title: 'Email' },
			{ id: 'phone', title: 'Phone' },
		]

		const groups: GridColumnGroup[] = [
			{ id: 'one', title: 'One', columns: ['first', 'last'] },
			{ id: 'two', title: 'Two', columns: [] },
		]

		const order = ['first', 'last', 'email', 'phone']

		const renderEditor = ({
			editorGroups = groups,
			reorderable = true,
			matches = () => true,
		}: {
			editorGroups?: GridColumnGroup[]
			reorderable?: boolean
			matches?: (item: { id: string | number }) => boolean
		} = {}) => {
			const onGroupsChange = vi.fn()

			const onOrderChange = vi.fn()

			renderUI(
				<GridGroupManager
					groups={editorGroups}
					onGroupsChange={onGroupsChange}
					columns={items}
					matches={matches}
					hidden={new Set()}
					onToggle={vi.fn()}
					order={order}
					onOrderChange={onOrderChange}
					reorderable={reorderable}
				/>,
			)

			return { onGroupsChange, onOrderChange }
		}

		it('moves an ungrouped column through the commit of a drop and announces its place', async () => {
			const { onGroupsChange, onOrderChange } = renderEditor()

			fireEvent.click(screen.getByRole('button', { name: 'Move Email' }))

			// The place moves come first, and the "Move to" items follow them.
			expect(labels()).toEqual(['Move down', 'Move to bottom', 'Move to “One”', 'Move to “Two”'])

			fireEvent.click(item('Move down'))

			expect(onOrderChange).toHaveBeenLastCalledWith(['first', 'last', 'phone', 'email'])

			// A drop commits the groups too, with the same members.
			expect(onGroupsChange).toHaveBeenLastCalledWith([
				{ id: 'one', title: 'One', columns: ['first', 'last'] },
				{ id: 'two', title: 'Two', columns: [] },
			])

			await expectAnnouncement('Email column moved to position 2 of 2.', 'assertive')
		})

		it('moves a column in its group through the groups', async () => {
			const { onGroupsChange, onOrderChange } = renderEditor()

			fireEvent.click(screen.getByRole('button', { name: 'Move Last' }))

			expect(labels()).toEqual(['Move up', 'Move to top', 'Move to “Two”', 'Remove from group'])

			fireEvent.click(item('Move to top'))

			expect(onGroupsChange).toHaveBeenLastCalledWith([
				{ id: 'one', title: 'One', columns: ['last', 'first'] },
				{ id: 'two', title: 'Two', columns: [] },
			])

			expect(onOrderChange).toHaveBeenLastCalledWith(order)

			await expectAnnouncement('Last column moved to position 1 of 2.', 'assertive')
		})

		it('moves a column among the rows on the screen, and a filtered-out column keeps its slot', () => {
			const { onOrderChange } = renderEditor({
				editorGroups: [],
				matches: (column) => column.id !== 'last',
			})

			fireEvent.click(screen.getByRole('button', { name: 'Move First' }))

			fireEvent.click(item('Move down'))

			expect(onOrderChange).toHaveBeenLastCalledWith(['email', 'last', 'first', 'phone'])
		})

		it('moves a group through the groups and announces its place', async () => {
			const { onGroupsChange } = renderEditor()

			fireEvent.click(screen.getByRole('button', { name: 'Move group Two' }))

			expect(labels()).toEqual(['Move up', 'Move to top'])

			fireEvent.click(item('Move up'))

			expect(onGroupsChange).toHaveBeenLastCalledWith([groups[1], groups[0]])

			await expectAnnouncement('Two group moved to position 1 of 2.', 'assertive')
		})

		it('offers the place moves only while the editor reorders', () => {
			renderEditor({ reorderable: false })

			expect(screen.queryByRole('button', { name: 'Move group One' })).not.toBeInTheDocument()

			fireEvent.click(screen.getByRole('button', { name: 'Move Email' }))

			expect(labels()).toEqual(['Move to “One”', 'Move to “Two”'])
		})

		it('offers no place move for a lone column or a lone group', () => {
			renderEditor({
				editorGroups: [{ id: 'one', title: 'One', columns: ['first'] }],
				matches: (column) => column.id !== 'phone',
			})

			expect(screen.queryByRole('button', { name: 'Move group One' })).not.toBeInTheDocument()

			fireEvent.click(screen.getByRole('button', { name: 'Move First' }))

			expect(labels()).toEqual(['Remove from group'])
		})

		it('renders the column menu with no group while the column has a place to go', () => {
			renderEditor({ editorGroups: [] })

			fireEvent.click(screen.getByRole('button', { name: 'Move First' }))

			expect(labels()).toEqual(['Move down', 'Move to bottom'])
		})
	})
})
