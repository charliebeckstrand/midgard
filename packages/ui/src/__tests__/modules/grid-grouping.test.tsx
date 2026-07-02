import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent, within } from '../helpers'

/**
 * Row grouping (`groupBy` + a grouped column): the engine's grouped/expanded row
 * models draw a group-header row (value + count) above each run of leaf rows.
 * Groups start expanded (or collapsed via `defaultExpanded`), each header toggles
 * its rows, and selection still tracks the flat leaf set. Grouping stands the
 * cursor / pagination / virtualization down, tested elsewhere by their absence.
 */
describe('Grid row grouping', () => {
	type Person = { id: number; name: string; role: string }

	const people: Person[] = [
		{ id: 1, name: 'Wade', role: 'Developer' },
		{ id: 2, name: 'Arlene', role: 'Designer' },
		{ id: 3, name: 'Devon', role: 'Manager' },
		{ id: 4, name: 'Tom', role: 'Developer' },
		{ id: 5, name: 'Tanya', role: 'Designer' },
	]

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const getKey = (row: Person) => row.id

	function groupToggles() {
		return screen.getAllByRole('button', { name: /group/ })
	}

	// A leaf row's `<tr>`, found by its cell text — collapsed groups keep their
	// rows mounted (hidden via `aria-hidden`) rather than unmounting them.
	function leafRow(name: string) {
		return screen.getByText(name).closest('tr')
	}

	it('draws a group-header row with a count per distinct value, expanded by default', () => {
		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		// One header per distinct role, each carrying its leaf count.
		expect(screen.getByText('Developer (2)')).toBeInTheDocument()

		expect(screen.getByText('Designer (2)')).toBeInTheDocument()

		expect(screen.getByText('Manager (1)')).toBeInTheDocument()

		// Expanded by default, so every leaf row shows.
		for (const name of ['Wade', 'Arlene', 'Devon', 'Tom', 'Tanya']) {
			expect(screen.getByText(name)).toBeInTheDocument()
		}
	})

	it('collapses a group to hide its leaf rows, and re-expands it', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />)

		// Expanded by default: the Developer rows show and aren't hidden.
		expect(leafRow('Wade')).not.toHaveAttribute('aria-hidden')

		await user.click(screen.getByRole('button', { name: 'Collapse group Developer' }))

		// The Developer leaves stay mounted but hide (collapsed height + `aria-hidden`);
		// other groups are untouched.
		expect(leafRow('Wade')).toHaveAttribute('aria-hidden', 'true')

		expect(leafRow('Tom')).toHaveAttribute('aria-hidden', 'true')

		expect(leafRow('Arlene')).not.toHaveAttribute('aria-hidden')

		// The header stays (now an expand affordance) and re-opens the group.
		await user.click(screen.getByRole('button', { name: 'Expand group Developer' }))

		expect(leafRow('Wade')).not.toHaveAttribute('aria-hidden')
	})

	it('starts collapsed under defaultExpanded: false', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role', defaultExpanded: false }}
			/>,
		)

		// Headers show; the leaf rows are present but hidden until a group expands.
		expect(screen.getByText('Developer (2)')).toBeInTheDocument()

		expect(leafRow('Wade')).toHaveAttribute('aria-hidden', 'true')

		expect(groupToggles()).toHaveLength(3)
	})

	it('keeps leaf-row selection working under grouping (select-all spans every group)', async () => {
		const user = userEvent.setup()

		function Harness() {
			const [selection, setSelection] = useState<Set<string | number>>(new Set())

			return (
				<Grid
					columns={[{ id: 'select', selectable: true }, ...columns]}
					rows={people}
					getKey={getKey}
					groupBy={{ value: 'role' }}
					selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
				/>
			)
		}

		renderUI(<Harness />)

		await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))

		// Every leaf row's checkbox reads checked across all groups.
		const rows = screen.getAllByRole('row')

		const leafCheckboxes = rows.flatMap((row) =>
			within(row).queryAllByRole('checkbox', { name: /Select row/ }),
		)

		expect(leafCheckboxes).toHaveLength(5)

		for (const box of leafCheckboxes) expect(box).toBeChecked()
	})

	it('leaves the grid ungrouped when groupBy names an unknown column', () => {
		renderUI(<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'nope' }} />)

		// No group headers; the rows render flat.
		expect(screen.queryByRole('button', { name: /group/ })).not.toBeInTheDocument()

		expect(screen.getByText('Wade')).toBeInTheDocument()
	})
})
