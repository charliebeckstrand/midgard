import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type CellChange,
	EditableGrid,
	type EditableGridColumn,
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
				getRowKey={(row) => row.id}
				onChange={() => {}}
			/>,
		)

		const el = bySlot(container, 'editable-grid')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'grid')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getRowKey={(row) => row.id}
				onChange={() => {}}
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
				getRowKey={(row) => row.id}
				onChange={() => {}}
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
				getRowKey={(row) => row.id}
				onChange={() => {}}
			/>,
		)

		expect(allBySlot(container, 'editable-grid-cell')).toHaveLength(rows.length * columns.length)
	})

	it('marks the clicked cell as active', () => {
		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getRowKey={(row) => row.id}
				onChange={() => {}}
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
				getRowKey={(row) => row.id}
				onChange={onChange}
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

	it('cancels the edit on Escape without firing onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<EditableGrid
				columns={columns}
				rows={rows}
				getRowKey={(row) => row.id}
				onChange={onChange}
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
				getRowKey={(row) => row.id}
				onChange={onChange}
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
			<EditableGrid columns={priced} rows={rows} getRowKey={(row) => row.id} onChange={onChange} />,
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
					getRowKey={(row) => row.id}
					selection={selection}
					onChange={captured}
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
				getRowKey={(row) => row.id}
				onChange={() => {}}
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
				getRowKey={(row) => row.id}
				onChange={onChange}
			/>,
		)

		const grid = bySlot(container, 'editable-grid') as HTMLElement
		const rateCell = allBySlot(container, 'editable-grid-cell')[1] as HTMLElement

		fireEvent.mouseDown(rateCell)

		fireEvent.keyDown(grid, { key: 'Delete' })

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: '' }])
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
				getRowKey={(row) => row.id}
				onChange={() => {}}
				virtualize
				maxHeight="300px"
			/>,
		)

		const rendered = container.querySelectorAll('tbody tr:not([data-slot="data-table-spacer"])')

		expect(rendered.length).toBeLessThan(manyRows.length)
	})
})
