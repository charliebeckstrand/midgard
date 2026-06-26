import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { createGroup, createRule, type QueryField } from '../../modules/query'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Grid per-column filters', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			filterable: true,
		},
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	const nameField: QueryField = { name: 'name', label: 'Name', type: 'text' }

	/** A query that keeps only rows whose name contains `text`. */
	const nameContains = (text: string) =>
		createGroup('and', [{ ...createRule(nameField), operator: 'contains', value: text }])

	/** A query holding one rule with no value — what a seeded or emptied builder leaves. */
	const blankRule = () =>
		createGroup('and', [{ ...createRule(nameField), operator: 'contains', value: '' }])

	/** A value-less "is empty" rule: a real constraint that carries no value. */
	const nameIsEmpty = () =>
		createGroup('and', [{ ...createRule(nameField), operator: 'isEmpty', value: '' }])

	it('renders a filter button only for filterable columns', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('button', { name: 'Filter Name' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Filter Role' })).not.toBeInTheDocument()
	})

	it('renders no filter button when no column is filterable', () => {
		const plain = columns.map((col) => ({ ...col, filterable: false }))

		renderUI(<Grid columns={plain} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: /^Filter / })).not.toBeInTheDocument()
	})

	it('opens a single-column query builder — rules only, no field selector or groups', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeInTheDocument()

		// Scoped to the column: no field picker, no nested groups.
		expect(screen.queryByRole('button', { name: 'Add group' })).not.toBeInTheDocument()

		const labels = Array.from(document.querySelectorAll('[data-slot="listbox-button"]'), (el) =>
			el.getAttribute('aria-label'),
		)

		expect(labels).not.toContain('Field')
	})

	it('accents the filter button via the color prop while a filter is active', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }] }}
			/>,
		)

		const button = screen.getByRole('button', { name: 'Filter Name' })

		expect(button).toHaveAttribute('data-active')

		// The Button's `color="blue"` tints the text (not just the always-blue
		// focus ring); the resting muted tint drops.
		expect(button.className).toMatch(/text-blue/)

		expect(button.className).not.toMatch(/text-zinc-500/)
	})

	it('leaves the filter button unaccented when no filter is active', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const button = screen.getByRole('button', { name: 'Filter Name' })

		expect(button).not.toHaveAttribute('data-active')

		expect(button.className).not.toMatch(/text-blue/)
	})

	it('leaves the button unaccented when a rule carries no value', () => {
		// A rule with no value (added then emptied, or the freshly seeded rule)
		// constrains nothing, so the button must read as inactive.
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: blankRule() }] }}
			/>,
		)

		const button = screen.getByRole('button', { name: 'Filter Name' })

		expect(button).not.toHaveAttribute('data-active')

		expect(button.className).not.toMatch(/text-blue/)
	})

	it('activates only after the seeded rule gains a value, then clears', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The popover opens on a seeded, value-less rule — still inactive.
		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')

		const value = screen.getByRole('textbox', { name: 'Name value' })

		fireEvent.change(value, { target: { value: 'Bob' } })

		expect(screen.getByRole('button', { name: 'Filter Name' })).toHaveAttribute('data-active')

		// Emptying the value (the "added then removed" end state) deactivates it again.
		fireEvent.change(value, { target: { value: '' } })

		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')
	})

	it('accents the button for a value-less operator (is empty)', () => {
		// "is empty" filters without a value; it is a real constraint, so the
		// button reads as active even though the rule has no value.
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameIsEmpty() }] }}
			/>,
		)

		const button = screen.getByRole('button', { name: 'Filter Name' })

		expect(button).toHaveAttribute('data-active')

		expect(button.className).toMatch(/text-blue/)
	})

	it('keeps the filter and sort affordances reachable when a filter empties the grid', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('no-such-name') }] }}
			/>,
		)

		// No row matches, so the body is empty...
		expect(screen.getByText('No items')).toBeInTheDocument()

		// ...but the source still has rows, so the header stays live — the filter
		// button is reachable to clear the filter, and the column stays sortable.
		expect(screen.getByRole('button', { name: 'Filter Name' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
	})

	it('applies a controlled column query client-side', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }] }}
			/>,
		)

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('does not filter client-side in manual (server) mode', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }], manual: true }}
			/>,
		)

		// The engine leaves rows untouched; the consumer filters server-side.
		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})
