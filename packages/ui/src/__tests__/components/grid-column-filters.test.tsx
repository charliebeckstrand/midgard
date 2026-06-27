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

	it('hides the remove control while a single rule remains, restoring it past one', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The lone seeded rule can't be removed (the filter keeps one), so no control.
		expect(screen.queryByRole('button', { name: 'Remove rule' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

		// Two rules now: each can be removed.
		expect(screen.getAllByRole('button', { name: 'Remove rule' })).toHaveLength(2)

		// Removing one returns to a single, again-unremovable rule.
		fireEvent.click(screen.getAllByRole('button', { name: 'Remove rule' })[0] as HTMLElement)

		expect(screen.queryByRole('button', { name: 'Remove rule' })).not.toBeInTheDocument()
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

	it('activates only after Apply settles a valued rule, and clears on Apply', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// The sheet opens on a seeded, value-less rule — still inactive.
		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')

		fireEvent.change(screen.getByRole('textbox', { name: 'Name value' }), {
			target: { value: 'Bob' },
		})

		// The edit is a draft: nothing reaches the engine, so the button stays inactive.
		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')

		// Apply settles it — now the button accents.
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

		expect(screen.getByRole('button', { name: 'Filter Name' })).toHaveAttribute('data-active')

		// Reopen, empty the value, and apply: the cleared rule deactivates it again.
		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		fireEvent.change(screen.getByRole('textbox', { name: 'Name value' }), {
			target: { value: '' },
		})

		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')
	})

	it('lifts an applied filter with Reset, restoring the hidden rows', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// Nothing applied yet — with no filter to lift, Reset isn't offered.
		expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

		fireEvent.change(screen.getByRole('textbox', { name: 'Name value' }), {
			target: { value: 'Bob' },
		})

		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

		// "name contains Bob" hides Alice.
		expect(screen.queryByText('Alice')).not.toBeInTheDocument()

		// Reopen — Reset is now live — and press it.
		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		// The filter lifts: the button deactivates and the hidden row returns.
		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')

		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('left-aligns the Reset button across from Cancel and Apply', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'name', value: nameContains('Bob') }] }}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		// An auto right-margin pushes Reset to the opposite edge from the pair.
		expect(screen.getByRole('button', { name: 'Reset' }).className).toContain('mr-auto')
	})

	it('discards a draft when the filter sheet is dismissed without applying', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		fireEvent.change(screen.getByRole('textbox', { name: 'Name value' }), {
			target: { value: 'Bob' },
		})

		// Cancel discards the draft — the filter never engaged.
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveAttribute('data-active')

		// Reopening starts from the applied (empty) state, not the discarded draft.
		fireEvent.click(screen.getByRole('button', { name: 'Filter Name' }))

		expect(screen.getByRole('textbox', { name: 'Name value' })).toHaveValue('')
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

describe('Grid date and boolean filters', () => {
	type Task = { id: number; title: string; due: string; done: boolean }

	const tasks: Task[] = [
		{ id: 1, title: 'Alpha', due: '2026-01-10', done: true },
		{ id: 2, title: 'Beta', due: '2026-03-20', done: false },
	]

	const getKey = (task: Task) => task.id

	const dueField: QueryField = { name: 'due', label: 'Due', type: 'date' }

	const doneField: QueryField = { name: 'done', label: 'Done', type: 'boolean' }

	const columns: GridColumn<Task>[] = [
		{ id: 'title', title: 'Title', cell: (task) => task.title, value: (task) => task.title },
		{
			id: 'due',
			title: 'Due',
			cell: (task) => task.due,
			value: (task) => task.due,
			filterable: true,
			filterType: 'date',
		},
		{
			id: 'done',
			title: 'Done',
			cell: (task) => (task.done ? 'yes' : 'no'),
			value: (task) => task.done,
			filterable: true,
			filterType: 'boolean',
		},
	]

	it('opens a date-picker value editor for a date filter', () => {
		renderUI(<Grid columns={columns} rows={tasks} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Due' }))

		// The date branch threads the column title through the DatePicker's aria-label.
		expect(screen.getByRole('button', { name: 'Due value' })).toBeInTheDocument()
	})

	it('filters rows by a date comparison (before)', () => {
		const before = createGroup('and', [
			{ ...createRule(dueField), operator: 'before', value: '2026-02-01' },
		])

		renderUI(
			<Grid
				columns={columns}
				rows={tasks}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'due', value: before }] }}
			/>,
		)

		expect(screen.getByText('Alpha')).toBeInTheDocument()

		expect(screen.queryByText('Beta')).not.toBeInTheDocument()
	})

	it('offers a value-less is-true / is-false operator for a boolean filter', () => {
		renderUI(<Grid columns={columns} rows={tasks} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Done' }))

		// The operator select shows, but a value-less operator suppresses the value
		// editor entirely (no input of any kind labelled for the field).
		expect(screen.getByRole('combobox', { name: 'Operator' })).toBeInTheDocument()

		expect(screen.queryByLabelText('Done value')).toBeNull()
	})

	it('filters rows by a boolean (is true)', () => {
		const isTrue = createGroup('and', [
			{ ...createRule(doneField), operator: 'isTrue', value: null },
		])

		renderUI(
			<Grid
				columns={columns}
				rows={tasks}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'done', value: isTrue }] }}
			/>,
		)

		expect(screen.getByText('Alpha')).toBeInTheDocument()

		expect(screen.queryByText('Beta')).not.toBeInTheDocument()
	})
})

describe('Grid numeric range filter', () => {
	type Item = { id: number; name: string; price: number }

	const items: Item[] = [
		{ id: 1, name: 'Cheap', price: 10 },
		{ id: 2, name: 'Mid', price: 50 },
		{ id: 3, name: 'Pricey', price: 100 },
	]

	const getKey = (item: Item) => item.id

	const priceField: QueryField = { name: 'price', label: 'Price', type: 'number' }

	const columns: GridColumn<Item>[] = [
		{ id: 'name', title: 'Name', cell: (item) => item.name, value: (item) => item.name },
		{
			id: 'price',
			title: 'Price',
			cell: (item) => item.price,
			value: (item) => item.price,
			filterable: true,
			filterType: 'number',
		},
	]

	const priceBetween = (lo: number | '', hi: number | '') =>
		createGroup('and', [{ ...createRule(priceField), operator: 'between', value: [lo, hi] }])

	it('renders two bound inputs for the between operator', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={items}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'price', value: priceBetween('', '') }] }}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Price' }))

		expect(screen.getByRole('spinbutton', { name: 'Price minimum' })).toBeInTheDocument()

		expect(screen.getByRole('spinbutton', { name: 'Price maximum' })).toBeInTheDocument()
	})

	it('keeps only rows within the range, inclusive of the bounds', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={items}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'price', value: priceBetween(20, 100) }] }}
			/>,
		)

		expect(screen.queryByText('Cheap')).not.toBeInTheDocument()

		expect(screen.getByText('Mid')).toBeInTheDocument()

		expect(screen.getByText('Pricey')).toBeInTheDocument()
	})

	it('applies a one-sided range when a bound is left blank', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={items}
				getKey={getKey}
				columnFilters={{ value: [{ id: 'price', value: priceBetween('', 50) }] }}
			/>,
		)

		expect(screen.getByText('Cheap')).toBeInTheDocument()

		expect(screen.getByText('Mid')).toBeInTheDocument()

		expect(screen.queryByText('Pricey')).not.toBeInTheDocument()
	})
})

describe('Grid faceted select filter', () => {
	type Row = { id: number; name: string; role: string }

	const getKey = (row: Row) => row.id

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
		{ id: 3, name: 'Cara', role: 'Developer' },
	]

	it('offers a select filter the column values when it declares no options', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			{
				id: 'role',
				title: 'Role',
				cell: (row) => row.role,
				value: (row) => row.role,
				filterable: true,
				filterType: 'select',
			},
		]

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Role' }))

		// The value editor is a Select; opening it reveals the faceted options.
		fireEvent.click(screen.getByRole('combobox', { name: 'Role value' }))

		// The column's own distinct values, sorted and de-duplicated (two, not three).
		expect(screen.getByRole('option', { name: 'Designer' })).toBeInTheDocument()

		expect(screen.getByRole('option', { name: 'Developer' })).toBeInTheDocument()

		expect(screen.getAllByRole('option')).toHaveLength(2)
	})

	it('uses explicit filterOptions over the faceted values when provided', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			{
				id: 'role',
				title: 'Role',
				cell: (row) => row.role,
				value: (row) => row.role,
				filterable: true,
				filterType: 'select',
				filterOptions: [{ label: 'Engineer', value: 'Engineer' }],
			},
		]

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		fireEvent.click(screen.getByRole('button', { name: 'Filter Role' }))

		fireEvent.click(screen.getByRole('combobox', { name: 'Role value' }))

		// The explicit option wins; the data values (Developer/Designer) don't appear.
		expect(screen.getByRole('option', { name: 'Engineer' })).toBeInTheDocument()

		expect(screen.queryByRole('option', { name: 'Developer' })).toBeNull()
	})
})
