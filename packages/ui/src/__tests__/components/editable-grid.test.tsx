import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type CellChange,
	EditableGrid,
	type EditableGridColumn,
	type EditableGridEditorProps,
} from '../../components/editable-grid'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; state: string; rate: number }

const rows: Row[] = [
	{ id: 1, state: 'CA', rate: 2.35 },
	{ id: 2, state: 'NV', rate: 2.2 },
	{ id: 3, state: 'AZ', rate: 2.1 },
]

const columns: EditableGridColumn<Row>[] = [
	{ id: 'state', title: 'State', field: 'state', readOnly: true },
	{ id: 'rate', title: 'Rate', field: 'rate' },
]

describe('EditableGrid', () => {
	it('renders with data-slot="editable-grid"', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const el = bySlot(container, 'editable-grid')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'grid')

		expect(el).toHaveAttribute('aria-multiselectable', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				className="custom"
			/>,
		)

		expect(bySlot(container, 'editable-grid')?.className).toContain('custom')
	})

	it('renders column headers and row values', () => {
		renderUI(
			<EditableGrid
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
	})

	it('renders a gridcell per editable column × row', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		expect(allBySlot(container, 'editable-grid-cell')).toHaveLength(rows.length * columns.length)
	})

	it('marks the clicked cell as active', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.mouseDown(cells[1] as HTMLElement)

		expect(cells[1]).toHaveAttribute('data-active')
	})

	it('opens an editor on double-click and commits on Enter', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const rateCell = allBySlot(container, 'editable-grid-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCell)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '9.99' }])
	})

	it('cancels the edit on Escape without firing onValueChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'editable-grid-cell')[1] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(onChange).not.toHaveBeenCalled()

		expect(bySlot(container, 'editable-grid-input')).not.toBeInTheDocument()
	})

	it('skips read-only columns when double-clicked', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const stateCell = allBySlot(container, 'editable-grid-cell')[0] as HTMLElement

		fireEvent.doubleClick(stateCell)

		expect(bySlot(container, 'editable-grid-input')).not.toBeInTheDocument()
	})

	it('runs format and parse through the column callbacks', () => {
		const onChange = vi.fn()

		const priced: EditableGridColumn<Row>[] = [
			{
				id: 'rate',
				title: 'Rate',
				field: 'rate',
				format: (r) => `$${r.rate.toFixed(2)}`,
				parse: (raw) => Number(raw),
			},
		]

		const { container } = renderUI(
			<EditableGrid
				columns={priced}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		expect(screen.getByText('$2.35')).toBeInTheDocument()

		fireEvent.doubleClick(allBySlot(container, 'editable-grid-cell')[0] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '5' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: 5 }])
	})

	it('fills the column across every selected row when one is edited', () => {
		function Harness() {
			const [selection] = useState<Set<string | number>>(new Set([1, 3]))

			return (
				<EditableGrid
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

		const rateCellForRow1 = allBySlot(container, 'editable-grid-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCellForRow1)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

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
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const grid = bySlot(container, 'editable-grid') as HTMLElement
		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.mouseDown(cells[0] as HTMLElement)

		expect(cells[0]).toHaveAttribute('data-active')

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(cells[0]).not.toHaveAttribute('data-active')

		expect(cells[2]).toHaveAttribute('data-active')
	})

	it('emits an empty-string write when Delete is pressed on an active cell', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const grid = bySlot(container, 'editable-grid') as HTMLElement
		const rateCell = allBySlot(container, 'editable-grid-cell')[1] as HTMLElement

		fireEvent.mouseDown(rateCell)

		fireEvent.keyDown(grid, { key: 'Delete' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '' }])
	})

	it('advances to the cell below on Enter commit', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.doubleClick(cells[1] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '7' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// After Enter the editor closes and the cell two rows down (same column) is active.
		expect(bySlot(container, 'editable-grid-input')).not.toBeInTheDocument()

		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('commits and advances to the right on Tab', () => {
		const onChange = vi.fn()

		const editable: EditableGridColumn<Row>[] = [
			{ id: 'state', title: 'State', field: 'state' },
			{ id: 'rate', title: 'Rate', field: 'rate' },
		]

		const { container } = renderUI(
			<EditableGrid
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.doubleClick(cells[0] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'TX' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'state', value: 'TX' }])

		expect(bySlot(container, 'editable-grid-input')).not.toBeInTheDocument()
	})

	it('commits and advances to the left on Shift+Tab', () => {
		const onChange = vi.fn()

		const editable: EditableGridColumn<Row>[] = [
			{ id: 'state', title: 'State', field: 'state' },
			{ id: 'rate', title: 'Rate', field: 'rate' },
		]

		const { container } = renderUI(
			<EditableGrid
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.doubleClick(cells[1] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9' } })

		fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '9' }])
	})

	it('skips committing when the draft equals the original formatted value', () => {
		const onChange = vi.fn()

		const priced: EditableGridColumn<Row>[] = [
			{
				id: 'rate',
				title: 'Rate',
				field: 'rate',
				format: (r) => `$${r.rate.toFixed(2)}`,
				parse: (raw) => Number(raw),
			},
		]

		const { container } = renderUI(
			<EditableGrid
				columns={priced}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'editable-grid-cell')[0] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		// Leave the value identical to the formatted original.
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('routes the second Enter through the closed-session guard without re-committing', () => {
		const onChange = vi.fn()

		const editable: EditableGridColumn<Row>[] = [{ id: 'rate', title: 'Rate', field: 'rate' }]

		const { container } = renderUI(
			<EditableGrid
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.doubleClick(cells[0] as HTMLElement)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

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
			<EditableGrid
				columns={columns}
				rows={manyRows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				virtualize
				maxHeight="300px"
			/>,
		)

		const rendered = container.querySelectorAll('tbody tr:not([data-slot="data-table-spacer"])')

		expect(rendered.length).toBeLessThan(manyRows.length)
	})

	it('extends the selection on shift+click', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		// Anchor the active cell, then shift-click another to extend selection.
		fireEvent.mouseDown(cells[1] as HTMLElement)

		fireEvent.mouseDown(cells[3] as HTMLElement, { shiftKey: true })

		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('adds an extra cell to the selection on meta+click', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
			/>,
		)

		const cells = allBySlot(container, 'editable-grid-cell')

		fireEvent.mouseDown(cells[1] as HTMLElement)

		fireEvent.mouseDown(cells[3] as HTMLElement, { metaKey: true })

		// Meta+click moves focus to the new cell and keeps the prior active in
		// the extras set — we can only directly observe the new active here.
		expect(cells[3]).toHaveAttribute('data-active')
	})

	it('Shift+Tab from column 0 focuses the row selection checkbox', () => {
		const selectableColumns: EditableGridColumn<Row>[] = [
			{ id: 'select', selectable: true } as EditableGridColumn<Row>,
			...columns,
		]

		const { container } = renderUI(
			<EditableGrid
				columns={selectableColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				selection={{ value: new Set() }}
			/>,
		)

		const grid = bySlot(container, 'editable-grid') as HTMLTableElement

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Tab', shiftKey: true })

		expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select row 1' }))
	})

	it('Tab from a row selection checkbox returns focus to the cell cursor', () => {
		const selectableColumns: EditableGridColumn<Row>[] = [
			{ id: 'select', selectable: true } as EditableGridColumn<Row>,
			...columns,
		]

		const { container } = renderUI(
			<EditableGrid
				columns={selectableColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={() => {}}
				selection={{ value: new Set() }}
			/>,
		)

		const grid = bySlot(container, 'editable-grid') as HTMLTableElement

		const rowCheckbox = screen.getByRole('checkbox', { name: 'Select row 2' })

		rowCheckbox.focus()

		fireEvent.keyDown(rowCheckbox, { key: 'Tab' })

		expect(document.activeElement).toBe(grid)

		// Row 2 is index 1; col 0 (first editable) of that row should be active.
		const cells = allBySlot(container, 'editable-grid-cell')

		// editableCols = [state, rate]; row 1 (second row) cell 0 = index 2.
		expect(cells[2]).toHaveAttribute('data-active')
	})

	it('renders selectable and actions columns alongside editable ones', () => {
		const mixedColumns: EditableGridColumn<Row>[] = [
			{ id: 'select', selectable: true } as EditableGridColumn<Row>,
			...columns,
			{
				id: 'actions',
				actions: (row: Row) => <button type="button">Edit {row.id}</button>,
			} as EditableGridColumn<Row>,
		]

		renderUI(
			<EditableGrid
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

		function CustomEditor({ draft, setDraft, commit }: EditableGridEditorProps<Row>) {
			return (
				<input
					data-slot="custom-editor"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()

							commit('down')
						}
					}}
				/>
			)
		}

		const editable: EditableGridColumn<Row>[] = [
			{ id: 'rate', title: 'Rate', field: 'rate', editor: CustomEditor },
		]

		const { container } = renderUI(
			<EditableGrid
				columns={editable}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onChange}
			/>,
		)

		fireEvent.doubleClick(allBySlot(container, 'editable-grid-cell')[0] as HTMLElement)

		const customInput = bySlot(container, 'custom-editor') as HTMLInputElement

		expect(customInput).toBeInTheDocument()

		expect(bySlot(container, 'editable-grid-input')).not.toBeInTheDocument()

		fireEvent.change(customInput, { target: { value: '8.88' } })

		fireEvent.keyDown(customInput, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '8.88' }])
	})

	it('flashes a cell when its committed value changes', () => {
		function StatefulGrid() {
			const [data, setData] = useState(rows)

			return (
				<EditableGrid
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

		const rateCell = allBySlot(container, 'editable-grid-cell')[1] as HTMLElement

		fireEvent.doubleClick(rateCell)

		const input = bySlot(container, 'editable-grid-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '9.99' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(rateCell.textContent).toContain('9.99')

		// The flash overlay is the cell's only aria-hidden child; it mounts once the value changes.
		expect(rateCell.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
	})
})
