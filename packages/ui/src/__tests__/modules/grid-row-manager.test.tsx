import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridRowGroup } from '../../modules/grid'
import { GridRowManager } from '../../modules/grid/grid-row-manager'
import { fireEvent, renderUI, screen, setupUser, waitFor, within } from '../helpers'

/**
 * The row manager: a "Manage rows" dialog reached from the group-header
 * right-click menu, where each row group takes a palette color (tinting its
 * header aggregation, total footer, and rail) and reorders, and its rows reorder
 * within it. The overlay is value-keyed and layered over the engine's grouping.
 */
describe('Grid row manager', () => {
	type Person = { id: number; name: string; role: string; salary: number }

	const people: Person[] = [
		{ id: 1, name: 'Wade', role: 'Developer', salary: 100 },
		{ id: 2, name: 'Arlene', role: 'Designer', salary: 90 },
		{ id: 3, name: 'Devon', role: 'Manager', salary: 120 },
		{ id: 4, name: 'Tom', role: 'Developer', salary: 110 },
	]

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
		{
			id: 'salary',
			title: 'Salary',
			cell: (row) => row.salary,
			value: (row) => row.salary,
			aggFunc: 'sum',
		},
	]

	const getKey = (row: Person) => row.id

	/** Right-clicks the Developer group-header row. */
	const rightClickDeveloperHeader = () => {
		const header = screen.getByText('Developer (2)')

		fireEvent.contextMenu(header)
	}

	it('names the group menu by its group', () => {
		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		expect(screen.getByRole('menu', { name: 'Developer group menu' })).toBeInTheDocument()
	})

	it('opens a group menu with Manage rows and expand controls on a group-header right-click', () => {
		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		expect(screen.getByRole('menuitem', { name: 'Manage rows' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Collapse group' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Expand all groups' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Collapse all groups' })).toBeInTheDocument()
	})

	it('keeps the rows of a null group and an undefined group apart under a group order', () => {
		type Loose = { id: number; team: string | null | undefined }

		const loose: Loose[] = [
			{ id: 1, team: 'a' },
			{ id: 2, team: null },
			{ id: 3, team: undefined },
			{ id: 4, team: undefined },
		]

		const teamColumns: GridColumn<Loose>[] = [
			{ id: 'id', title: 'Id', cell: (row) => `row ${row.id}`, value: (row) => row.id },
			{ id: 'team', title: 'Team', cell: (row) => String(row.team), value: (row) => row.team },
		]

		// The order that a manager commit writes: one entry for each group.
		const order: GridRowGroup[] = [{ key: 'undefined' }, { key: 'null' }, { key: 'a' }]

		const { container } = renderUI(
			<Grid
				columns={teamColumns}
				rows={loose}
				getKey={(row) => row.id}
				groupBy={{ value: 'team', rowGroups: order }}
			/>,
		)

		const shown = Array.from(
			container.querySelectorAll('tbody td[data-grid-col="id"]'),
			(cell) => cell.textContent,
		)

		expect(shown).toEqual(['row 3', 'row 4', 'row 2', 'row 1'])
	})

	it('opens Manage rows with focus in the dialog, and hands it back to the group on Close', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		const toggle = screen.getByRole('button', { name: 'Collapse group Developer' })

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)

		await user.click(screen.getByRole('button', { name: 'Close' }))

		await waitFor(() => expect(toggle).toHaveFocus())
	})

	it('does not offer the group menu when the row manager is disabled', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role', rowManager: false }}
			/>,
		)

		rightClickDeveloperHeader()

		// No group menu opens (the right-click hit a group row, which the surface
		// swallows when the resolver yields no items).
		expect(screen.queryByRole('menuitem', { name: 'Manage rows' })).not.toBeInTheDocument()
	})

	it('collapses every group from the group menu', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		expect(screen.getByText('Wade').closest('tr')).not.toHaveAttribute('aria-hidden')

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Collapse all groups' }))

		expect(screen.getByText('Wade').closest('tr')).toHaveAttribute('aria-hidden', 'true')
	})

	it('colors a group from the manager, committing the overlay and tinting its header', async () => {
		const user = setupUser()

		const onValueChange = vi.fn<(groups: GridRowGroup[]) => void>()

		renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role', rowGroups: { onValueChange } }}
			/>,
		)

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		// The dialog lists a color control per group.
		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		await user.click(screen.getByRole('menuitem', { name: 'Red' }))

		// A complete snapshot — an entry per group — with only Developer colored.
		const committed = onValueChange.mock.calls.at(-1)?.[0]

		expect(committed).toEqual(expect.arrayContaining([{ key: 'Developer', color: 'red' }]))

		expect(committed).toHaveLength(3)

		// The group's card in the dialog outlines its whole border in the color.
		expect(document.querySelector('[class*="outline-red-600"]')).not.toBeNull()

		// The same commit reaches the grid: the Developer header row carries the
		// solid rail and the aggregate wash.
		const headerRow = screen.getByText('Developer (2)').closest('tr')

		expect(headerRow?.querySelector('[class*="border-s-red-600"]')).not.toBeNull()

		expect(headerRow?.querySelector('[class*="bg-red-500"]')).not.toBeNull()
	})

	it('offers the color menu None only once a group is colored', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		// Uncolored: nothing to clear, so None is withheld.
		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		expect(screen.queryByRole('menuitem', { name: 'None' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('menuitem', { name: 'Red' }))

		// Colored: reopening the menu now offers None. The name of the trigger
		// starts with the visible color (WCAG 2.5.3).
		await user.click(screen.getByRole('button', { name: 'Red color for Developer' }))

		expect(screen.getByRole('menuitem', { name: 'None' })).toBeInTheDocument()
	})

	it('names the color menu by its trigger', async () => {
		const user = setupUser()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		expect(screen.getByRole('menu', { name: 'Color for Developer' })).toBeInTheDocument()
	})
})

describe('GridRowManager list', () => {
	it('renders the group zones as the items of a list', () => {
		renderUI(
			<GridRowManager
				groups={[
					{ key: 'a', label: 'Alpha', count: 2 },
					{ key: 'b', label: 'Beta', count: 1 },
				]}
				onRecolor={() => {}}
				onReorderGroups={() => {}}
			/>,
		)

		const list = screen.getByRole('list')

		expect(within(list).getAllByRole('listitem')).toHaveLength(2)

		expect(screen.getByText('Alpha').closest('li')?.parentElement).toBe(list)
	})
})
