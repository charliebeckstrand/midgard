import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridRowGroup } from '../../modules/grid'
import { fireEvent, renderUI, screen, userEvent } from '../helpers'

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

	it('opens a group menu with Manage rows and expand controls on a group-header right-click', () => {
		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		expect(screen.getByRole('menuitem', { name: 'Manage rows' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Collapse group' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Expand all groups' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Collapse all groups' })).toBeInTheDocument()
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
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		expect(screen.getByText('Wade').closest('tr')).not.toHaveAttribute('aria-hidden')

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Collapse all groups' }))

		expect(screen.getByText('Wade').closest('tr')).toHaveAttribute('aria-hidden', 'true')
	})

	it('opens the manager and colors a group, committing a complete overlay', async () => {
		const user = userEvent.setup()

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
	})

	it('offers the color menu None only once a group is colored', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		// Uncolored: nothing to clear, so None is withheld.
		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		expect(screen.queryByRole('menuitem', { name: 'None' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('menuitem', { name: 'Red' }))

		// Colored: reopening the menu now offers None.
		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		expect(screen.getByRole('menuitem', { name: 'None' })).toBeInTheDocument()
	})

	it('tints the group header aggregation with the group color', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		rightClickDeveloperHeader()

		await user.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		await user.click(screen.getByRole('button', { name: 'Color for Developer' }))

		await user.click(screen.getByRole('menuitem', { name: 'Red' }))

		// The Developer header row now carries the solid red rail and a red aggregate wash.
		const headerRow = screen.getByText('Developer (2)').closest('tr')

		expect(headerRow?.querySelector('[class*="border-l-red-600"]')).not.toBeNull()

		expect(headerRow?.querySelector('[class*="bg-red-500"]')).not.toBeNull()
	})
})
