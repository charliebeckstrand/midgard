import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridEditableColumn } from '../../modules/grid'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; rate: number }

const rows: Row[] = [{ id: 1, rate: 2 }]

const columns: GridEditableColumn<Row>[] = [
	{
		id: 'rate',
		title: 'Rate',
		field: 'rate',
		parse: (raw) => Number(raw),
		validate: (value) => (typeof value === 'number' && value > 0 ? null : 'Must be positive'),
	},
]

function renderGrid(onValueChange: (changes: unknown[]) => void) {
	return renderUI(
		<Grid
			editable
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			onValueChange={onValueChange}
		/>,
	)
}

function editActiveCell(container: HTMLElement, value: string) {
	fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[0] as HTMLElement)

	const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

	fireEvent.change(input, { target: { value } })

	fireEvent.keyDown(input, { key: 'Enter' })

	return input
}

describe('GridEditable validation', () => {
	it('rejects an invalid commit, keeps the editor open, and shows the message', () => {
		const onValueChange = vi.fn()

		const { container } = renderGrid(onValueChange)

		editActiveCell(container, '-5')

		expect(onValueChange).not.toHaveBeenCalled()

		expect(screen.getByRole('alert')).toHaveTextContent('Must be positive')

		// The editor stays mounted so the value can be fixed.
		expect(bySlot(container, 'grid-editable-input')).toBeInTheDocument()
	})

	it('commits once the value passes and clears the error', () => {
		const onValueChange = vi.fn()

		const { container } = renderGrid(onValueChange)

		editActiveCell(container, '-5')

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '5' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'rate', value: 5 }])

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
})

describe('GridEditable undo/redo', () => {
	const plainColumns: GridEditableColumn<Row>[] = [
		{ id: 'rate', title: 'Rate', field: 'rate', parse: (raw) => Number(raw) },
	]

	function renderPlain(onValueChange: (changes: unknown[]) => void) {
		return renderUI(
			<Grid
				editable
				columns={plainColumns}
				rows={rows}
				getKey={(row) => row.id}
				onValueChange={onValueChange}
			/>,
		)
	}

	it('Ctrl+Z re-emits the prior value after a commit', () => {
		const onValueChange = vi.fn()

		const { container } = renderPlain(onValueChange)

		fireEvent.doubleClick(allBySlot(container, 'grid-editable-cell')[0] as HTMLElement)

		const input = bySlot(container, 'grid-editable-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '5' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'rate', value: 5 }])

		fireEvent.keyDown(bySlot(container, 'grid-editable') as HTMLElement, {
			key: 'z',
			ctrlKey: true,
		})

		// Undo restores the cell's prior value (rows unchanged in the spy harness).
		expect(onValueChange).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'rate', value: 2 }])
	})
})
