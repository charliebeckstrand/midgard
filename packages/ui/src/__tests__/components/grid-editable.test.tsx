import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type CellChange,
	Grid,
	type GridEditableColumn,
	type GridEditableEditorProps,
} from '../../modules/grid'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; state: string; rate: number }

const rows: Row[] = [
	{ id: 1, state: 'CA', rate: 2.35 },
	{ id: 2, state: 'NV', rate: 2.2 },
	{ id: 3, state: 'AZ', rate: 2.1 },
]

const columns: GridEditableColumn<Row>[] = [
	{ id: 'state', title: 'State', field: 'state', readOnly: true },
	{ id: 'rate', title: 'Rate', field: 'rate' },
]

describe('Grid', () => {
	it('renders with data-slot="grid-editable"', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const el = bySlot(container, 'grid-editable')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'grid')

		expect(el).toHaveAttribute('aria-multiselectable', 'true')
	})

	it('renders column headers, row values, and a gridcell per editable column × row', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		expect(screen.getByText('State')).toBeInTheDocument()

		expect(screen.getByText('Rate')).toBeInTheDocument()

		expect(screen.getByText('CA')).toBeInTheDocument()

		expect(screen.getByText('2.35')).toBeInTheDocument()

		expect(allBySlot(container, 'grid-editable-cell')).toHaveLength(rows.length * columns.length)
	})

	it('marks the clicked cell as active', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.mouseDown(cells[1] as HTMLElement)

		expect(cells[1]).toHaveAttribute('data-active')
	})

	it('opens an editor on double-click and commits on Enter', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const rateCell = allBySlot(container, 'grid-editable-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCell)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '9.99' }])
	})

	it('names the open editor by its column title and row number', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		// Second row, rate column.
		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[3] as HTMLElement)

		// String column titles name the editor by what it edits; the bare
		// "row 2 column 2" coordinate form is the non-string-title fallback only.
		expect(bySlot(container, 'grid-editable-input')).toHaveAttribute(
			'aria-label',
			'Edit Rate, row 2',
		)
	})

	it('cancels the edit on Escape without firing onValueChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[1] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(onChange).not.toHaveBeenCalled()

		expect(bySlot(container, 'grid-editable-input')).not.toBeInTheDocument()
	})

	it('skips read-only columns when double-clicked', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const stateCell = allBySlot(container, 'grid-editable-cell')[0] as HTMLElement

		fireEvent.doubleClick(stateCell)

		expect(bySlot(container, 'grid-editable-input')).not.toBeInTheDocument()
	})

	it('runs format and parse through the column callbacks', () => {
		const onChange = vi.fn()

		const priced: GridEditableColumn<Row>[] = [
			{
				id: 'rate',
				title: 'Rate',
				field: 'rate',
				format: (r) => `$${r.rate.toFixed(2)}`,
				parse: (raw) => Number(raw),
			},
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={priced}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		expect(screen.getByText('$2.35')).toBeInTheDocument()

		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[0] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '5' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: 5 }])
	})

	it('fills the column across every selected row when one is edited', () => {
		function Harness() {
			const [selection] = useState<Set<string | number>>(new Set([1, 3]))

			return (
				<Grid
					editable
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					selection={{ value: selection }}
					onValueChange={captured}
				/>
			)
		}

		const captured = vi.fn<(changes: CellChange[]) => void>()

		const { container } = renderUI(<Harness />)

		const rateCellForRow1 = allBySlot(container, 'grid-editable-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCellForRow1)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '4.2' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(captured).toHaveBeenCalledTimes(1)

		expect(captured.mock.calls[0]?.[0]).toEqual([
			{ rowKey: 1, columnId: 'rate', value: '4.2' },
			{ rowKey: 3, columnId: 'rate', value: '4.2' },
		])
	})

	it('moves the active cell with arrow keys', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const grid = bySlot(container, 'grid-editable') as HTMLElement

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.mouseDown(cells[0] as HTMLElement)

		expect(cells[0]).toHaveAttribute('data-active')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(cells[0]).not.toHaveAttribute('data-active')

		expect(cells[2]).toHaveAttribute('data-active')
	})

	it('emits an empty-string write when Delete is pressed on an active cell', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const grid = bySlot(container, 'grid-editable') as HTMLElement

		const rateCell = allBySlot(container, 'grid-editable-cell')[1] as HTMLElement

		fireEvent.mouseDown(rateCell)

		fireEvent.keyDown(grid, { key: 'Delete' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '' }])
	})

	it('advances to the cell below on Enter commit', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.doubleClick(cells[1] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '7' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// After Enter the editor closes and the cell two rows down (same column) is active.
		expect(bySlot(container, 'grid-editable-input')).not.toBeInTheDocument()

		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('commits and advances to the right on Tab', () => {
		const onChange = vi.fn()

		const editable: GridEditableColumn<Row>[] = [
			{ id: 'state', title: 'State', field: 'state' },
			{ id: 'rate', title: 'Rate', field: 'rate' },
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.doubleClick(cells[0] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'TX' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'state', value: 'TX' }])

		expect(bySlot(container, 'grid-editable-input')).not.toBeInTheDocument()
	})

	it('commits and advances to the left on Shift+Tab', () => {
		const onChange = vi.fn()

		const editable: GridEditableColumn<Row>[] = [
			{ id: 'state', title: 'State', field: 'state' },
			{ id: 'rate', title: 'Rate', field: 'rate' },
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.doubleClick(cells[1] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9' } })

		fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '9' }])
	})

	it('skips committing when the draft equals the original formatted value', () => {
		const onChange = vi.fn()

		const priced: GridEditableColumn<Row>[] = [
			{
				id: 'rate',
				title: 'Rate',
				field: 'rate',
				format: (r) => `$${r.rate.toFixed(2)}`,
				parse: (raw) => Number(raw),
			},
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={priced}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[0] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		// Leave the value identical to the formatted original.
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('routes the second Enter through the closed-session guard without re-committing', () => {
		const onChange = vi.fn()

		const editable: GridEditableColumn<Row>[] = [{ id: 'rate', title: 'Rate', field: 'rate' }]

		const { container } = renderUI(
			<Grid
				editable
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.doubleClick(cells[0] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '11' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// The input unmounts after Enter, so its onBlur fires synchronously and
		// would otherwise commit a second time; the session guard suppresses that.
		expect(onChange).toHaveBeenCalledTimes(1)
	})

	it('renders only a subset of rows when virtualized', () => {
		const manyRows: Row[] = Array.from({ length: 500 }, (_, i) => ({
			id: i,
			state: 'CA',
			rate: i,
		}))

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={manyRows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				virtualize
				maxHeight="300px"
			/>,
		)

		const rendered = container.querySelectorAll('tbody tr:not([data-slot="grid-spacer"])')

		expect(rendered.length).toBeLessThan(manyRows.length)
	})

	it('extends the selection on shift+click', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		// Anchor the active cell, then shift-click another to extend selection.
		fireEvent.mouseDown(cells[1] as HTMLElement)

		fireEvent.mouseDown(cells[3] as HTMLElement, { shiftKey: true })

		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('exposes the selected range on the gridcells via aria-selected', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		// role="gridcell" lives on the owning <td>; aria-selected must too.
		const gridcell = (i: number) => cells[i]?.closest('[role="gridcell"]')

		fireEvent.mouseDown(cells[1] as HTMLElement)

		fireEvent.mouseDown(cells[3] as HTMLElement, { shiftKey: true })

		// Both ends of the range report selected, so the extension is visible to AT.
		expect(gridcell(1)).toHaveAttribute('aria-selected', 'true')

		expect(gridcell(3)).toHaveAttribute('aria-selected', 'true')

		// A cell outside the range stays selectable-but-not-selected.
		expect(gridcell(0)).toHaveAttribute('aria-selected', 'false')
	})

	it('adds an extra cell to the selection on meta+click', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'grid-editable-cell')

		fireEvent.mouseDown(cells[1] as HTMLElement)

		fireEvent.mouseDown(cells[3] as HTMLElement, { metaKey: true })

		// Meta+click moves focus to the new cell and keeps the prior active in
		// the extras set; only the new active is directly observable here.
		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('Shift+Tab from column 0 focuses the row selection checkbox', () => {
		const selectableColumns: GridEditableColumn<Row>[] = [
			{ id: 'select', selectable: true } as GridEditableColumn<Row>,
			...columns,
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={selectableColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				selection={{ value: new Set() }}
			/>,
		)

		const grid = bySlot(container, 'grid-editable') as HTMLTableElement

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Tab', shiftKey: true })

		expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select row 1' }))
	})

	it('Tab from a row selection checkbox returns focus to the cell cursor', () => {
		const selectableColumns: GridEditableColumn<Row>[] = [
			{ id: 'select', selectable: true } as GridEditableColumn<Row>,
			...columns,
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={selectableColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				selection={{ value: new Set() }}
			/>,
		)

		const grid = bySlot(container, 'grid-editable') as HTMLTableElement

		const rowCheckbox = screen.getByRole('checkbox', { name: 'Select row 2' })

		rowCheckbox.focus()

		fireEvent.keyDown(rowCheckbox, { key: 'Tab' })

		expect(document.activeElement).toBe(grid)

		// Row 2 is index 1; col 0 (first editable) of that row is active.
		const cells = allBySlot(container, 'grid-editable-cell')

		// editableCols = [state, rate]; row 1 (second row) cell 0 = index 2.
		expect(cells[2]).toHaveAttribute('data-active')
	})

	it('renders selectable and actions columns alongside editable ones', () => {
		const mixedColumns: GridEditableColumn<Row>[] = [
			{ id: 'select', selectable: true } as GridEditableColumn<Row>,
			...columns,
			{
				id: 'actions',
				actions: (row: Row) => <button type="button">Edit {row.id}</button>,
			} as GridEditableColumn<Row>,
		]

		renderUI(
			<Grid
				editable
				columns={mixedColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		// Selection checkboxes for each row, plus per-row action buttons.
		expect(screen.getAllByRole('checkbox', { name: /Select row/ }).length).toBe(rows.length)

		expect(screen.getByText('Edit 1')).toBeInTheDocument()
	})

	it('renders a column-supplied editor slot in place of the default input', () => {
		const onChange = vi.fn()

		function CustomEditor({ draft, setDraft, commit }: GridEditableEditorProps<Row>) {
			return (
				<input
					data-slot="custom-editor"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault()

							commit('down')
						}
					}}
				/>
			)
		}

		const editable: GridEditableColumn<Row>[] = [
			{ id: 'rate', title: 'Rate', field: 'rate', editor: CustomEditor },
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[0] as HTMLElement)

		const customInput = bySlot(container, 'custom-editor') as HTMLInputElement

		expect(customInput).toBeInTheDocument()

		expect(bySlot(container, 'grid-editable-input')).not.toBeInTheDocument()

		fireEvent.change(customInput, { target: { value: '8.88' } })

		fireEvent.keyDown(customInput, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '8.88' }])
	})

	it('flashes a cell when its committed value changes', () => {
		function StatefulGrid() {
			const [data, setData] = useState(rows)

			return (
				<Grid
					editable
					columns={columns}
					rows={data}
					getKey={(row) => row.id}
					onValueChange={(changes) => {
						const change = changes[0] as CellChange

						setData((prev) =>
							prev.map((row) =>
								row.id === change.rowKey ? { ...row, rate: Number(change.value) } : row,
							),
						)
					}}
				/>
			)
		}

		const { container } = renderUI(<StatefulGrid />)

		const rateCell = allBySlot(container, 'grid-editable-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCell)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(rateCell.textContent).toContain('9.99')

		// The flash overlay is the cell's only aria-hidden child; it mounts once the value changes.
		expect(rateCell.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
	})
})

describe('Grid editable context menus', () => {
	/** Right-clicks the first editable cell whose text contains `text`. */
	const rightClickCell = (container: HTMLElement, text: string) => {
		const cell = allBySlot(container, 'grid-editable-cell').find((el) =>
			el.textContent?.includes(text),
		)

		if (!cell) throw new Error(`no editable cell containing "${text}"`)

		fireEvent.contextMenu(cell)
	}

	/** Right-clicks the header of the column with `id`. */
	const rightClickHeader = (container: HTMLElement, id: string) => {
		const header = container.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`)

		if (!header) throw new Error(`no header for column "${id}"`)

		fireEvent.contextMenu(header)
	}

	it('opens a cell menu with Copy by default', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		rightClickCell(container, 'CA')

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('opens a column menu with the grid-wide tools by default, omitting sort items', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		rightClickHeader(container, 'rate')

		// Editing keeps sorting opt-in, so a column that has not asked for it shows
		// no sort items — unlike the read-only grid, which sorts by default.
		expect(screen.queryByRole('menuitem', { name: 'Sort ascending' })).not.toBeInTheDocument()

		// The grid-wide tools still render.
		expect(screen.getByRole('menuitem', { name: 'Manage columns' })).toBeInTheDocument()
	})

	it('does not start the navigable cursor when a header is right-clicked', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const grid = bySlot(container, 'grid-editable') as HTMLTableElement

		const header = container.querySelector<HTMLElement>('th[data-grid-col="rate"]')

		if (!header) throw new Error('no header for column "rate"')

		// The header carries no cell handler, so a right-click would otherwise focus
		// the grid and seed the cursor. The wrapper suppresses that default; a real
		// browser fires the follow-on focus only when the press was not prevented, so
		// gate the simulated focus on the dispatch result the same way.
		const notPrevented = fireEvent.mouseDown(header, { button: 2 })

		if (notPrevented) fireEvent.focus(grid)

		// The cursor stays unseated: no active descendant and no active cell.
		expect(grid).not.toHaveAttribute('aria-activedescendant')

		expect(
			allBySlot(container, 'grid-editable-cell').some((cell) => cell.hasAttribute('data-active')),
		).toBe(false)
	})

	it('surfaces sort items for a column that opts into sortable', () => {
		const sortableColumns: GridEditableColumn<Row>[] = [
			{ id: 'state', title: 'State', field: 'state', readOnly: true },
			{ id: 'rate', title: 'Rate', field: 'rate', sortable: true },
		]

		const { container } = renderUI(
			<Grid
				editable
				columns={sortableColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		rightClickHeader(container, 'rate')

		expect(screen.getByRole('menuitem', { name: 'Sort ascending' })).toBeInTheDocument()
	})

	it('shows no menu when contextMenu is false', () => {
		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				contextMenu={false}
			/>,
		)

		rightClickCell(container, 'CA')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('passes the row to a cell-menu builder and runs a custom item', () => {
		const onFlag = vi.fn()

		const { container } = renderUI(
			<Grid
				editable
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				contextMenu={{
					cell: ({ row }, defaults) => [
						...defaults,
						{ key: 'flag', label: `Flag ${row.state}`, onSelect: () => onFlag(row) },
					],
				}}
			/>,
		)

		rightClickCell(container, 'CA')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Flag CA' }))

		expect(onFlag).toHaveBeenCalledWith(rows[0])
	})
})
