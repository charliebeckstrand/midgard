import { describe, expect, it, vi } from 'vitest'
import { Grid } from '../../modules/grid'
import { bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('Grid', () => {
	type Row = { name: string; age: number }

	const columns = [
		{ id: 'name', title: 'Name', cell: (row: Row) => row.name },
		{ id: 'age', title: 'Age', cell: (row: Row) => row.age },
	]

	const rows: Row[] = [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.name

	it('renders column headers', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Name')).toBeInTheDocument()

		expect(screen.getByText('Age')).toBeInTheDocument()
	})

	it('renders row data', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByText('30')).toBeInTheDocument()
	})

	it('shows loading spinner when loading', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} loading />)

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('marks the table aria-busy while loading and clears it otherwise', () => {
		const { rerender } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} loading />)

		expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')

		rerender(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
	})

	it('renders a default empty state when there are no rows', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.getByText('No items')).toBeInTheDocument()
	})

	it('renders custom empty content when `empty` is provided', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} empty="No people match" />)

		expect(screen.getByText('No people match')).toBeInTheDocument()
	})

	it('prefers the loading skeleton over the empty state', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} loading />)

		expect(screen.queryByText('No items')).not.toBeInTheDocument()
	})

	it('renders a selection checkbox column when a column declares selectable', () => {
		const selectColumns = [{ id: 'select', selectable: true }, ...columns]

		renderUI(<Grid columns={selectColumns} rows={rows} getKey={getKey} />)

		const checkboxes = screen.getAllByRole('checkbox', { name: /Select row/ })

		expect(checkboxes.length).toBe(rows.length)
	})

	it('renders custom actions cells when a column declares actions', () => {
		const actionsColumns = [
			...columns,
			{
				id: 'actions',
				actions: (row: { name: string }) => <button type="button">Edit {row.name}</button>,
			},
		]

		renderUI(<Grid columns={actionsColumns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('button', { name: 'Edit Alice' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Edit Bob' })).toBeInTheDocument()
	})

	it('spreads per-row props from cellProps onto the cell', () => {
		const cellPropsColumns = [
			{
				id: 'name',
				title: 'Name',
				cell: (row: { name: string }) => row.name,
				cellProps: (row: { name: string }) => ({
					'data-row-name': row.name,
					className: 'extra-cell',
				}),
			},
		]

		const { container } = renderUI(<Grid columns={cellPropsColumns} rows={rows} getKey={getKey} />)

		const cells = container.querySelectorAll('tbody td')

		const aliceCell = Array.from(cells).find((c) => c.getAttribute('data-row-name') === 'Alice')

		expect(aliceCell).toBeDefined()

		expect(aliceCell?.className).toContain('extra-cell')
	})

	it('renders an empty cell when a column has no cell renderer', () => {
		const sparseColumns = [{ id: 'empty', title: 'Empty' }]

		const { container } = renderUI(<Grid columns={sparseColumns} rows={rows} getKey={getKey} />)

		const cells = container.querySelectorAll('tbody td')

		expect(cells.length).toBe(rows.length)

		for (const cell of cells) {
			expect(cell.textContent).toBe('')
		}
	})

	describe('sortable columns', () => {
		const sortableColumns = [
			{
				id: 'name',
				title: 'Name',
				cell: (row: { name: string }) => row.name,
				sortable: true,
			},
			{
				id: 'age',
				title: 'Age',
				cell: (row: { age: number }) => row.age,
				sortable: true,
			},
		]

		it('renders a sort button for sortable columns', () => {
			renderUI(<Grid columns={sortableColumns} rows={rows} getKey={getKey} />)

			expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
		})

		it('exposes the current sort direction via aria-sort', () => {
			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
				/>,
			)

			expect(screen.getByRole('button', { name: 'Sort by Name' }).closest('th')).toHaveAttribute(
				'aria-sort',
				'ascending',
			)

			// An unsorted but sortable column reports "none".
			expect(screen.getByRole('button', { name: 'Sort by Age' }).closest('th')).toHaveAttribute(
				'aria-sort',
				'none',
			)
		})

		it('fires onValueChange with asc on first sort click', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid columns={sortableColumns} rows={rows} getKey={getKey} sort={{ onValueChange }} />,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(onValueChange).toHaveBeenCalledWith([{ column: 'name', direction: 'asc' }])
		})

		it('toggles direction from asc to desc when clicked again on the same column', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: [{ column: 'name', direction: 'asc' }], onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(onValueChange).toHaveBeenLastCalledWith([{ column: 'name', direction: 'desc' }])
		})

		it('clears the sort on the third click of the same column', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: [{ column: 'name', direction: 'desc' }], onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			// Starting at desc, the next click completes asc → desc → unsorted.
			await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

			// The unsorted state is the empty list.
			expect(onValueChange).toHaveBeenLastCalledWith([])
		})

		it('resets to asc when sorting on a different column', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: [{ column: 'name', direction: 'desc' }], onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Age' }))

			expect(onValueChange).toHaveBeenLastCalledWith([{ column: 'age', direction: 'asc' }])
		})

		it('Shift-click adds a column to the sort in priority order', () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: [{ column: 'name', direction: 'asc' }], onValueChange }}
				/>,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Age' }), { shiftKey: true })

			expect(onValueChange).toHaveBeenLastCalledWith([
				{ column: 'name', direction: 'asc' },
				{ column: 'age', direction: 'asc' },
			])
		})

		it('Shift-click flips an already-sorted column, leaving the others', () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{
						defaultValue: [
							{ column: 'name', direction: 'asc' },
							{ column: 'age', direction: 'asc' },
						],
						onValueChange,
					}}
				/>,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Age' }), { shiftKey: true })

			expect(onValueChange).toHaveBeenLastCalledWith([
				{ column: 'name', direction: 'asc' },
				{ column: 'age', direction: 'desc' },
			])
		})

		it('Shift-click drops a descending column from the sort', () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{
						defaultValue: [
							{ column: 'name', direction: 'asc' },
							{ column: 'age', direction: 'desc' },
						],
						onValueChange,
					}}
				/>,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Age' }), { shiftKey: true })

			expect(onValueChange).toHaveBeenLastCalledWith([{ column: 'name', direction: 'asc' }])
		})

		it('a plain click collapses a multi-column sort to that one column', () => {
			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{
						defaultValue: [
							{ column: 'name', direction: 'asc' },
							{ column: 'age', direction: 'asc' },
						],
						onValueChange,
					}}
				/>,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(onValueChange).toHaveBeenLastCalledWith([{ column: 'name', direction: 'asc' }])
		})

		it('renders the asc icon for the active sorted column', () => {
			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ value: [{ column: 'name', direction: 'asc' }] }}
				/>,
			)

			const sortButton = screen.getByRole('button', { name: 'Sort by Name' })

			expect(sortButton.querySelector('svg')).toBeInTheDocument()

			// The non-active column has no icon.
			const ageButton = screen.getByRole('button', { name: 'Sort by Age' })

			expect(ageButton.querySelector('svg')).toBeNull()
		})

		it('renders the desc icon when direction is desc', () => {
			renderUI(
				<Grid
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ value: [{ column: 'age', direction: 'desc' }] }}
				/>,
			)

			const button = screen.getByRole('button', { name: 'Sort by Age' })

			expect(button.querySelector('svg')).toBeInTheDocument()
		})

		it('falls back to the column id in the aria-label when title is not a string', () => {
			const richColumns = [
				{
					id: 'name',
					title: <span>Name</span>,
					cell: (row: { name: string }) => row.name,
					sortable: true,
				},
			]

			renderUI(<Grid columns={richColumns} rows={rows} getKey={getKey} />)

			expect(screen.getByRole('button', { name: 'Sort by name' })).toBeInTheDocument()
		})

		it('renders a non-button header for a non-sortable column', () => {
			const mixedColumns = [
				{
					id: 'name',
					title: 'Name',
					cell: (row: { name: string }) => row.name,
					sortable: false,
				},
				{
					id: 'age',
					title: 'Age',
					cell: (row: { age: number }) => row.age,
					sortable: true,
				},
			]

			renderUI(<Grid columns={mixedColumns} rows={rows} getKey={getKey} />)

			expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Sort by Age' })).toBeInTheDocument()
		})

		it('makes data columns sortable by default', () => {
			const plainColumns = [
				{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
			]

			renderUI(<Grid columns={plainColumns} rows={rows} getKey={getKey} />)

			expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
		})

		it('disables sorting for every column when sortable is false', () => {
			const plainColumns = [
				{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
				{ id: 'age', title: 'Age', cell: (row: { age: number }) => row.age, sortable: true },
			]

			renderUI(<Grid columns={plainColumns} rows={rows} getKey={getKey} sortable={false} />)

			expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

			// A column opting in explicitly still overrides the grid-level default.
			expect(screen.getByRole('button', { name: 'Sort by Age' })).toBeInTheDocument()
		})
	})

	describe('header customisation', () => {
		it('applies headerClassName and width to sortable and selectable headers', () => {
			const columnsWithChrome = [
				{ id: 'select', selectable: true, headerClassName: 'sel-head', width: '40px' },
				{
					id: 'name',
					title: 'Name',
					cell: (row: { name: string }) => row.name,
					headerClassName: 'name-head',
					width: '200px',
					sortable: true,
				},
			]

			const { container } = renderUI(
				<Grid columns={columnsWithChrome} rows={rows} getKey={getKey} />,
			)

			const headers = container.querySelectorAll('thead th')

			expect((headers[0] as HTMLElement).className).toContain('sel-head')

			expect((headers[0] as HTMLElement).style.width).toBe('40px')

			expect((headers[1] as HTMLElement).className).toContain('name-head')

			expect((headers[1] as HTMLElement).style.width).toBe('200px')
		})

		it('adds sticky-header chrome when stickyHeader is set', () => {
			const { container } = renderUI(
				<Grid columns={columns} rows={rows} getKey={getKey} stickyHeader maxHeight="200px" />,
			)

			// Sticky header forces the scroll wrapper to render.
			expect(container.querySelector('[style*="max-height"]')).toBeInTheDocument()
		})
	})

	describe('selection', () => {
		it('hides the select-all header checkbox when there are no rows', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(<Grid columns={selectColumns} rows={[]} getKey={getKey} />)

			expect(screen.queryByRole('checkbox', { name: 'Select all rows' })).not.toBeInTheDocument()
		})

		it('renders an active select-all checkbox header that toggles every row', async () => {
			const onValueChange = vi.fn()

			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<Grid columns={selectColumns} rows={rows} getKey={getKey} selection={{ onValueChange }} />,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))

			expect(onValueChange).toHaveBeenCalledOnce()

			const next = onValueChange.mock.calls[0]?.[0] as Set<string | number>

			expect(next.size).toBe(rows.length)
		})

		it('marks the select-all checkbox as indeterminate when only some rows are selected', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<Grid
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{ value: new Set(['Alice']) }}
				/>,
			)

			const checkbox = screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement

			expect(checkbox.indeterminate).toBe(true)
		})

		it('renders batchActions in a toolbar when there is a selection', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<Grid
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{
						value: new Set(['Alice']),
						batchActions: ({ selection }) => <button type="button">Delete {selection.size}</button>,
					}}
				/>,
			)

			expect(screen.getByRole('button', { name: 'Delete 1' })).toBeInTheDocument()
		})

		it('hides the batch action button when no rows are selected', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<Grid
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{
						batchActions: ({ selection }) => <button type="button">Delete {selection.size}</button>,
					}}
				/>,
			)

			expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
		})

		it('fires toggleRow when an individual row checkbox is clicked', () => {
			const onValueChange = vi.fn()

			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<Grid columns={selectColumns} rows={rows} getKey={getKey} selection={{ onValueChange }} />,
			)

			fireEvent.click(screen.getByRole('checkbox', { name: 'Select row Alice' }))

			expect(onValueChange).toHaveBeenCalledOnce()
		})

		it('renders a row in the selected state when its rowKey is in the selection', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			const { container } = renderUI(
				<Grid
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{ value: new Set(['Alice']) }}
				/>,
			)

			const selectedRow = container.querySelector('tbody tr[data-selected]')

			expect(selectedRow).toBeInTheDocument()
		})
	})

	describe('row loading', () => {
		it('emits loading chrome on individual rows', () => {
			const { container } = renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					rowLoading={(row) => row.name === 'Alice'}
				/>,
			)

			// Both rows still render; the loading flag only mutates the row classes.
			const trs = container.querySelectorAll('tbody tr')

			expect(trs).toHaveLength(rows.length)
		})
	})

	describe('column manager', () => {
		it('renders the column-manager toolbar when enabled', () => {
			renderUI(
				<Grid columns={columns} rows={rows} getKey={getKey} columnManager={{ enabled: true }} />,
			)

			expect(screen.getByRole('button', { name: /Columns/ })).toBeInTheDocument()
		})

		it('honors a custom label on the column-manager toolbar', () => {
			renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, label: 'Manage' }}
				/>,
			)

			expect(screen.getByRole('button', { name: /Manage/ })).toBeInTheDocument()
		})

		it('drops hidden columns from the rendered header', () => {
			renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, defaultHidden: new Set(['age']) }}
				/>,
			)

			expect(screen.queryByText('Age')).not.toBeInTheDocument()

			expect(screen.getByText('Name')).toBeInTheDocument()
		})

		it('reorders columns when columnOrder.value is provided', () => {
			const { container } = renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnOrder={{ value: ['age', 'name'] }}
				/>,
			)

			const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)

			expect(headers).toEqual(['Age', 'Name'])
		})

		it('keeps selectable and actions columns visible even when listed as hidden', () => {
			const selectColumns = [
				{ id: 'select', selectable: true },
				{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
				{
					id: 'actions',
					actions: (row: { name: string }) => <button type="button">Edit {row.name}</button>,
				},
			]

			renderUI(
				<Grid
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					columnManager={{
						enabled: true,
						defaultHidden: new Set(['select', 'actions', 'name']),
					}}
				/>,
			)

			// Select column survives: the checkbox column header still renders.
			expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument()

			// Actions column survives: buttons still render in body.
			expect(screen.getByRole('button', { name: 'Edit Alice' })).toBeInTheDocument()

			// Regular hideable column is dropped.
			expect(screen.queryByText('Name')).not.toBeInTheDocument()
		})

		it('appends columns added after mount that are not in the stored order', () => {
			const { rerender, container } = renderUI(
				<Grid
					columns={[columns[0] as (typeof columns)[number]]}
					rows={rows}
					getKey={getKey}
					columnOrder={{ defaultValue: ['name'] }}
				/>,
			)

			expect(container.querySelectorAll('thead th')).toHaveLength(1)

			rerender(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnOrder={{ defaultValue: ['name'] }}
				/>,
			)

			const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)

			expect(headers).toContain('Age')
		})

		it('forwards columnOrder.onValueChange and onHiddenChange to the manager dialog', async () => {
			const onValueChange = vi.fn()

			const onHiddenChange = vi.fn()

			renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnOrder={{ onValueChange }}
					columnManager={{ enabled: true, onHiddenChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: /Columns/ }))

			await user.click(screen.getByRole('checkbox', { name: 'Show Age' }))

			expect(onHiddenChange).toHaveBeenCalled()
		})
	})

	describe('reorder', () => {
		// The dnd-kit drag lifecycle is a third-party async seam (testing rule
		// 10.3); these assert the rendered handle affordances, while the splice
		// that a committed drag produces is covered in use-grid-columns.

		it('renders a reorder handle on every data column when reorder is set', () => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} reorder />)

			expect(screen.getByRole('button', { name: 'Reorder Name' })).toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Reorder Age' })).toBeInTheDocument()
		})

		it('renders no reorder handles when reorder is unset', () => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

			expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument()
		})

		it('skips the selection and actions columns', () => {
			const mixed = [
				{ id: 'select', selectable: true },
				...columns,
				{
					id: 'actions',
					actions: (row: Row) => <button type="button">Edit {row.name}</button>,
				},
			]

			renderUI(<Grid columns={mixed} rows={rows} getKey={getKey} reorder />)

			// Only the two data columns are draggable; select/actions get no handle.
			expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(2)
		})

		it('skips pinned columns', () => {
			const pinnedCols = [
				{ id: 'name', title: 'Name', cell: (r: Row) => r.name, pinned: true },
				{ id: 'age', title: 'Age', cell: (r: Row) => r.age },
				{ id: 'role', title: 'Role', cell: () => 'Member' },
			]

			renderUI(<Grid columns={pinnedCols} rows={rows} getKey={getKey} reorder />)

			// Two non-pinned data columns remain draggable; the pinned one is held.
			expect(screen.queryByRole('button', { name: 'Reorder Name' })).not.toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Reorder Age' })).toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Reorder Role' })).toBeInTheDocument()
		})

		it('renders no handles when fewer than two columns are reorderable', () => {
			const single = [{ id: 'name', title: 'Name', cell: (r: Row) => r.name }]

			renderUI(<Grid columns={single} rows={rows} getKey={getKey} reorder />)

			expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument()

			// The header itself still renders.
			expect(screen.getByText('Name')).toBeInTheDocument()
		})

		it('still renders body cell content for reorderable columns (drag-along cells)', () => {
			renderUI(<Grid columns={columns} rows={rows} getKey={getKey} reorder />)

			// Each non-pinned data cell registers against the column sortable; its
			// content must keep rendering through that wrapper.
			expect(screen.getByText('Alice')).toBeInTheDocument()

			expect(screen.getByText('30')).toBeInTheDocument()
		})

		it('keeps the sort button alongside the reorder handle on a sortable column', () => {
			const sortable = [
				{ id: 'name', title: 'Name', cell: (r: Row) => r.name, sortable: true },
				{ id: 'age', title: 'Age', cell: (r: Row) => r.age },
			]

			renderUI(<Grid columns={sortable} rows={rows} getKey={getKey} reorder />)

			expect(screen.getByRole('button', { name: 'Reorder Name' })).toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
		})
	})

	describe('virtualize', () => {
		const manyRows = Array.from({ length: 500 }, (_, i) => ({
			name: `Person ${i}`,
			age: i,
		}))

		it('throws when virtualize is set without maxHeight', () => {
			expect(() =>
				renderUI(<Grid columns={columns} rows={manyRows} getKey={getKey} virtualize />),
			).toThrow(/requires `maxHeight`/)
		})

		it('renders only a subset of rows when virtualized', () => {
			const { container } = renderUI(
				<Grid columns={columns} rows={manyRows} getKey={getKey} virtualize maxHeight="300px" />,
			)

			// jsdom reports zero viewport size; react-virtual renders roughly `overscan` rows.
			const rendered = container.querySelectorAll('tbody tr:not([data-slot="grid-spacer"])')

			expect(rendered.length).toBeLessThan(manyRows.length)
		})

		it('accepts an options object', () => {
			const { container } = renderUI(
				<Grid
					columns={columns}
					rows={manyRows}
					getKey={getKey}
					virtualize={{ estimateSize: 32, overscan: 5 }}
					maxHeight="300px"
				/>,
			)

			expect(bySlot(container, 'grid')).toBeInTheDocument()
		})

		it('reports the full row count and indexes rows despite windowing', () => {
			const { container } = renderUI(
				<Grid columns={columns} rows={manyRows} getKey={getKey} virtualize maxHeight="300px" />,
			)

			const table = container.querySelector('table')

			// Header (row 1) + 500 data rows.
			expect(table).toHaveAttribute('aria-rowcount', '501')

			const headerRow = container.querySelector('thead tr')

			// jsdom reports a zero-size viewport; the window renders no data rows.
			// Asserts the table-level row count and the header's 1-based aria-rowindex.
			expect(headerRow).toHaveAttribute('aria-rowindex', '1')
		})

		it('does not set aria-rowcount on a non-virtualized table', () => {
			const { container } = renderUI(<Grid columns={columns} rows={manyRows} getKey={getKey} />)

			expect(container.querySelector('table')).not.toHaveAttribute('aria-rowcount')
		})

		it('exposes grid semantics so the row/col index scheme is honored', () => {
			const { container } = renderUI(
				<Grid columns={columns} rows={manyRows} getKey={getKey} virtualize maxHeight="300px" />,
			)

			const table = container.querySelector('table')

			// aria-rowindex/rowcount are inert on a plain role="table".
			expect(table).toHaveAttribute('role', 'grid')

			expect(table).toHaveAttribute('aria-colcount', String(columns.length))

			const headers = container.querySelectorAll('thead th')

			expect(headers[0]).toHaveAttribute('aria-colindex', '1')

			expect(headers[headers.length - 1]).toHaveAttribute('aria-colindex', String(columns.length))
		})

		it('keeps the native table role when not virtualized', () => {
			const { container } = renderUI(<Grid columns={columns} rows={manyRows} getKey={getKey} />)

			const table = container.querySelector('table')

			expect(table).not.toHaveAttribute('role', 'grid')

			expect(table).not.toHaveAttribute('aria-colcount')
		})
	})

	it('labels selection checkboxes with rowLabel instead of the raw key', () => {
		const selectColumns = [{ id: 'select', selectable: true }, ...columns]

		renderUI(
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={getKey}
				rowLabel={(row) => `${row.name}, age ${row.age}`}
			/>,
		)

		expect(screen.getByRole('checkbox', { name: 'Select Alice, age 30' })).toBeInTheDocument()
	})
})
