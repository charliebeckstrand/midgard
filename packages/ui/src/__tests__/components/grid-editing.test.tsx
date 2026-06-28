import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, fireEvent, renderUI } from '../helpers'

/**
 * Per-row inline editing baked into Grid: a row marked editable via the
 * `editable` binding gains click-to-focus cells that enter edit mode on
 * double-click / Enter. The editor is inferred from the cell value's primitive
 * type, or overridden by a column's `editCell` slot; Enter / blur commit and
 * Escape cancels.
 */
describe('Grid per-row editing', () => {
	type Row = { id: number; name: string; count: number; done: boolean }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2, done: false },
		{ id: 2, name: 'Bob', count: 5, done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
		{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
	]

	const cellAt = (container: HTMLElement, rowKey: number, colId: string) =>
		container.querySelector<HTMLElement>(
			`tr[data-grid-row="${rowKey}"] td[data-grid-col="${colId}"]`,
		)

	function renderGrid(editableRows: Set<string | number>) {
		const onValueChange = vi.fn()

		const view = renderUI(
			<Grid
				columns={columns}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{ rows: editableRows, onValueChange }}
			/>,
		)

		return { ...view, onValueChange }
	}

	it('does not enter edit mode on a cell whose row is not editable', () => {
		const { container } = renderGrid(new Set())

		const cell = cellAt(container, 1, 'name')

		if (!cell) throw new Error('no name cell')

		fireEvent.doubleClick(cell)

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('opens an inferred text editor on double-click and commits on Enter', () => {
		const { container, onValueChange } = renderGrid(new Set([1]))

		const cell = cellAt(container, 1, 'name')

		if (!cell) throw new Error('no name cell')

		fireEvent.doubleClick(cell)

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		fireEvent.change(input, { target: { value: 'Alice Cooper' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([
			{ rowKey: 1, columnId: 'name', value: 'Alice Cooper' },
		])

		// The editor closes after a commit.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('commits on blur', () => {
		const { container, onValueChange } = renderGrid(new Set([1]))

		fireEvent.doubleClick(cellAt(container, 1, 'name') as HTMLElement)

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Renamed' } })

		fireEvent.blur(input)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Renamed' }])
	})

	it('cancels on Escape without committing', () => {
		const { container, onValueChange } = renderGrid(new Set([1]))

		fireEvent.doubleClick(cellAt(container, 1, 'name') as HTMLElement)

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(onValueChange).not.toHaveBeenCalled()

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('does not emit when the value is unchanged', () => {
		const { container, onValueChange } = renderGrid(new Set([1]))

		fireEvent.doubleClick(cellAt(container, 1, 'name') as HTMLElement)

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('infers a number editor for a numeric cell', () => {
		const { container } = renderGrid(new Set([1]))

		fireEvent.doubleClick(cellAt(container, 1, 'count') as HTMLElement)

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('infers a checkbox for a boolean cell and commits the flipped value on toggle', () => {
		const { container, onValueChange } = renderGrid(new Set([1]))

		fireEvent.doubleClick(cellAt(container, 1, 'done') as HTMLElement)

		const checkbox = bySlot(container, 'grid-edit-boolean-input') as HTMLInputElement

		expect(checkbox).toBeInTheDocument()

		fireEvent.click(checkbox)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'done', value: true }])
	})

	it('begins editing on Enter when the active cell is editable', () => {
		const { container } = renderGrid(new Set([1]))

		const cell = cellAt(container, 1, 'name')

		if (!cell) throw new Error('no name cell')

		// Seat the cursor on the cell, then Enter opens its editor.
		fireEvent.mouseDown(cell)

		const grid = container.querySelector<HTMLElement>('[role="grid"]') as HTMLElement

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()
	})

	it('uses a column editCell slot instead of the inferred editor', () => {
		const onValueChange = vi.fn()

		const slotColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				editCell: ({ value, onValueUpdate, commit, cancel }) => (
					<input
						data-slot="custom-edit"
						value={String(value ?? '')}
						onChange={(event) => onValueUpdate(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') commit()
							else if (event.key === 'Escape') cancel()
						}}
					/>
				),
			},
		]

		const { container } = renderUI(
			<Grid
				columns={slotColumns}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{ rows: new Set([1]), onValueChange }}
			/>,
		)

		fireEvent.doubleClick(
			container.querySelector('tr[data-grid-row="1"] td[data-grid-col="name"]') as HTMLElement,
		)

		const slot = bySlot(container, 'custom-edit') as HTMLInputElement

		expect(slot).toBeInTheDocument()

		// The grid mounted no inferred text editor in its place.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		fireEvent.change(slot, { target: { value: 'Slotted' } })

		fireEvent.keyDown(slot, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Slotted' }])
	})

	it('rejects an invalid commit, keeps the editor open, then commits once valid', () => {
		const onValueChange = vi.fn()

		const validatedColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				validate: (value) => (String(value).length > 0 ? null : 'Required'),
			},
		]

		const { container } = renderUI(
			<Grid
				columns={validatedColumns}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{ rows: new Set([1]), onValueChange }}
			/>,
		)

		fireEvent.doubleClick(
			container.querySelector('tr[data-grid-row="1"] td[data-grid-col="name"]') as HTMLElement,
		)

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).not.toHaveBeenCalled()

		expect(container.querySelector('[role="alert"]')).toHaveTextContent('Required')

		// The editor stays mounted so the value can be fixed.
		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Fixed' },
		})

		fireEvent.keyDown(bySlot(container, 'grid-edit-input') as HTMLInputElement, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Fixed' }])
	})

	it('cancels an open edit when its row leaves the editable set', () => {
		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set())}>
						Stop editing
					</button>
					<Grid
						columns={columns}
						rows={baseRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onValueChange: () => {} }}
					/>
				</>
			)
		}

		const { container, getByRole } = renderUI(<Harness />)

		fireEvent.doubleClick(
			container.querySelector('tr[data-grid-row="1"] td[data-grid-col="name"]') as HTMLElement,
		)

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		fireEvent.click(getByRole('button', { name: 'Stop editing' }))

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})
})
