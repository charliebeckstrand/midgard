import { describe, expect, it, vi } from 'vitest'
import { DataTable } from '../../components/data-table'
import { bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('DataTable', () => {
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

	it('renders with data-slot="data-table"', () => {
		const { container } = renderUI(<DataTable columns={columns} rows={rows} getKey={getKey} />)

		const el = bySlot(container, 'data-table')

		expect(el).toBeInTheDocument()
	})

	it('renders column headers', () => {
		renderUI(<DataTable columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Name')).toBeInTheDocument()

		expect(screen.getByText('Age')).toBeInTheDocument()
	})

	it('renders row data', () => {
		renderUI(<DataTable columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()

		expect(screen.getByText('Bob')).toBeInTheDocument()

		expect(screen.getByText('30')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<DataTable columns={columns} rows={rows} getKey={getKey} className="custom" />,
		)

		expect(container.querySelector('.custom')).toBeInTheDocument()
	})

	it('shows loading spinner when loading', () => {
		renderUI(<DataTable columns={columns} rows={rows} getKey={getKey} loading />)

		expect(screen.queryByText('Alice')).not.toBeInTheDocument()
	})

	it('renders a default empty state when there are no rows', () => {
		renderUI(<DataTable columns={columns} rows={[]} getKey={getKey} />)

		expect(screen.getByText('No items')).toBeInTheDocument()
	})

	it('renders custom empty content when `empty` is provided', () => {
		renderUI(<DataTable columns={columns} rows={[]} getKey={getKey} empty="No people match" />)

		expect(screen.getByText('No people match')).toBeInTheDocument()
	})

	it('prefers the loading skeleton over the empty state', () => {
		renderUI(<DataTable columns={columns} rows={[]} getKey={getKey} loading />)

		expect(screen.queryByText('No items')).not.toBeInTheDocument()
	})

	it('renders a selection checkbox column when a column declares selectable', () => {
		const selectColumns = [{ id: 'select', selectable: true }, ...columns]

		renderUI(<DataTable columns={selectColumns} rows={rows} getKey={getKey} />)

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

		renderUI(<DataTable columns={actionsColumns} rows={rows} getKey={getKey} />)

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

		const { container } = renderUI(
			<DataTable columns={cellPropsColumns} rows={rows} getKey={getKey} />,
		)

		const cells = container.querySelectorAll('tbody td')

		const aliceCell = Array.from(cells).find((c) => c.getAttribute('data-row-name') === 'Alice')

		expect(aliceCell).toBeDefined()

		expect(aliceCell?.className).toContain('extra-cell')
	})

	it('renders an empty cell when a column has no cell renderer', () => {
		const sparseColumns = [{ id: 'empty', title: 'Empty' }]

		const { container } = renderUI(
			<DataTable columns={sparseColumns} rows={rows} getKey={getKey} />,
		)

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
			renderUI(<DataTable columns={sortableColumns} rows={rows} getKey={getKey} />)

			expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument()
		})

		it('fires onValueChange with asc on first sort click', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<DataTable
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(onValueChange).toHaveBeenCalledWith({ column: 'name', direction: 'asc' })
		})

		it('toggles direction from asc to desc when clicked again on the same column', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<DataTable
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: { column: 'name', direction: 'asc' }, onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(onValueChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'desc' })
		})

		it('resets to asc when sorting on a different column', async () => {
			const onValueChange = vi.fn()

			renderUI(
				<DataTable
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ defaultValue: { column: 'name', direction: 'desc' }, onValueChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: 'Sort by Age' }))

			expect(onValueChange).toHaveBeenLastCalledWith({ column: 'age', direction: 'asc' })
		})

		it('renders the asc icon for the active sorted column', () => {
			renderUI(
				<DataTable
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ value: { column: 'name', direction: 'asc' } }}
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
				<DataTable
					columns={sortableColumns}
					rows={rows}
					getKey={getKey}
					sort={{ value: { column: 'age', direction: 'desc' } }}
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

			renderUI(<DataTable columns={richColumns} rows={rows} getKey={getKey} />)

			expect(screen.getByRole('button', { name: 'Sort by name' })).toBeInTheDocument()
		})

		it('renders a non-button header for a non-sortable column', () => {
			const mixedColumns = [
				{
					id: 'name',
					title: 'Name',
					cell: (row: { name: string }) => row.name,
				},
				{
					id: 'age',
					title: 'Age',
					cell: (row: { age: number }) => row.age,
					sortable: true,
				},
			]

			renderUI(<DataTable columns={mixedColumns} rows={rows} getKey={getKey} />)

			expect(screen.queryByRole('button', { name: 'Sort by Name' })).not.toBeInTheDocument()

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
				<DataTable columns={columnsWithChrome} rows={rows} getKey={getKey} />,
			)

			const headers = container.querySelectorAll('thead th')

			expect((headers[0] as HTMLElement).className).toContain('sel-head')

			expect((headers[0] as HTMLElement).style.width).toBe('40px')

			expect((headers[1] as HTMLElement).className).toContain('name-head')

			expect((headers[1] as HTMLElement).style.width).toBe('200px')
		})

		it('adds sticky-header chrome when stickyHeader is set', () => {
			const { container } = renderUI(
				<DataTable columns={columns} rows={rows} getKey={getKey} stickyHeader maxHeight="200px" />,
			)

			// Sticky header forces the scroll wrapper to render.
			expect(container.querySelector('[style*="max-height"]')).toBeInTheDocument()
		})
	})

	describe('selection', () => {
		it('hides the select-all header checkbox when there are no rows', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(<DataTable columns={selectColumns} rows={[]} getKey={getKey} />)

			expect(screen.queryByRole('checkbox', { name: 'Select all rows' })).not.toBeInTheDocument()
		})

		it('renders an active select-all checkbox header that toggles every row', async () => {
			const onValueChange = vi.fn()

			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			renderUI(
				<DataTable
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{ onValueChange }}
				/>,
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
				<DataTable
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
				<DataTable
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
				<DataTable
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
				<DataTable
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					selection={{ onValueChange }}
				/>,
			)

			fireEvent.click(screen.getByRole('checkbox', { name: 'Select row Alice' }))

			expect(onValueChange).toHaveBeenCalledOnce()
		})

		it('renders a row in the selected state when its rowKey is in the selection', () => {
			const selectColumns = [{ id: 'select', selectable: true }, ...columns]

			const { container } = renderUI(
				<DataTable
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
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					rowLoading={(row) => row.name === 'Alice'}
				/>,
			)

			// Both rows still render — the loading flag only mutates the row classes.
			const trs = container.querySelectorAll('tbody tr')

			expect(trs).toHaveLength(rows.length)
		})
	})

	describe('column manager', () => {
		it('renders the column-manager toolbar when enabled', () => {
			renderUI(
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true }}
				/>,
			)

			expect(screen.getByRole('button', { name: /Columns/ })).toBeInTheDocument()
		})

		it('honors a custom label on the column-manager toolbar', () => {
			renderUI(
				<DataTable
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
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, defaultHidden: new Set(['age']) }}
				/>,
			)

			expect(screen.queryByText('Age')).not.toBeInTheDocument()

			expect(screen.getByText('Name')).toBeInTheDocument()
		})

		it('reorders columns when columnManager.order is provided', () => {
			const { container } = renderUI(
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, order: ['age', 'name'] }}
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
				<DataTable
					columns={selectColumns}
					rows={rows}
					getKey={getKey}
					columnManager={{
						enabled: true,
						defaultHidden: new Set(['select', 'actions', 'name']),
					}}
				/>,
			)

			// Select column survives — the checkbox column header still renders.
			expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument()

			// Actions column survives — buttons still render in body.
			expect(screen.getByRole('button', { name: 'Edit Alice' })).toBeInTheDocument()

			// Regular hideable column is dropped.
			expect(screen.queryByText('Name')).not.toBeInTheDocument()
		})

		it('appends columns added after mount that are not in the stored order', () => {
			const { rerender, container } = renderUI(
				<DataTable
					columns={[columns[0] as (typeof columns)[number]]}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, defaultOrder: ['name'] }}
				/>,
			)

			expect(container.querySelectorAll('thead th')).toHaveLength(1)

			rerender(
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, defaultOrder: ['name'] }}
				/>,
			)

			const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)

			expect(headers).toContain('Age')
		})

		it('forwards onOrderChange and onHiddenChange to the manager dialog', async () => {
			const onOrderChange = vi.fn()

			const onHiddenChange = vi.fn()

			renderUI(
				<DataTable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnManager={{ enabled: true, onOrderChange, onHiddenChange }}
				/>,
			)

			const user = userEvent.setup()

			await user.click(screen.getByRole('button', { name: /Columns/ }))

			await user.click(screen.getByRole('checkbox', { name: 'Show Age' }))

			expect(onHiddenChange).toHaveBeenCalled()
		})
	})

	describe('virtualize', () => {
		const manyRows = Array.from({ length: 500 }, (_, i) => ({
			name: `Person ${i}`,
			age: i,
		}))

		it('throws when virtualize is set without maxHeight', () => {
			expect(() =>
				renderUI(<DataTable columns={columns} rows={manyRows} getKey={getKey} virtualize />),
			).toThrow(/requires `maxHeight`/)
		})

		it('renders only a subset of rows when virtualized', () => {
			const { container } = renderUI(
				<DataTable
					columns={columns}
					rows={manyRows}
					getKey={getKey}
					virtualize
					maxHeight="300px"
				/>,
			)

			// jsdom reports zero viewport size, so react-virtual renders roughly
			// `overscan` rows. The point is that it's far fewer than 500.
			const rendered = container.querySelectorAll('tbody tr:not([data-slot="data-table-spacer"])')

			expect(rendered.length).toBeLessThan(manyRows.length)
		})

		it('accepts an options object', () => {
			const { container } = renderUI(
				<DataTable
					columns={columns}
					rows={manyRows}
					getKey={getKey}
					virtualize={{ estimateSize: 32, overscan: 5 }}
					maxHeight="300px"
				/>,
			)

			expect(bySlot(container, 'data-table')).toBeInTheDocument()
		})
	})
})
