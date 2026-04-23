import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Coord, EditableGridColumn } from '../../components/editable-grid/context'
import { useEditableGridMutations } from '../../components/editable-grid/use-editable-grid-mutations'

type Row = { id: string; value: string }

const cols: EditableGridColumn<Row>[] = [
	{ id: 'value', title: 'Value' } as EditableGridColumn<Row>,
	{ id: 'readonly', title: 'RO', readOnly: true } as EditableGridColumn<Row>,
]

function setup(
	options: {
		rows?: Row[]
		selection?: Set<string | number>
		active?: Coord | null
		anchor?: Coord | null
		extras?: Set<string>
	} = {},
) {
	const rows = options.rows ?? [
		{ id: 'a', value: '' },
		{ id: 'b', value: '' },
		{ id: 'c', value: '' },
	]

	const onChange = vi.fn()
	const setSelection = vi.fn()

	const { result } = renderHook(() =>
		useEditableGridMutations<Row>({
			editableCols: cols,
			rowsRef: { current: rows },
			selectionRef: { current: options.selection ?? new Set() },
			activeRef: { current: options.active ?? null },
			anchorRef: { current: options.anchor ?? null },
			extraCellsRef: { current: options.extras ?? new Set() },
			getRowKey: (r) => r.id,
			parseValue: (raw) => raw,
			onChange,
			setSelection,
		}),
	)

	return { api: result.current, onChange, setSelection }
}

describe('useEditableGridMutations: applyCellWrite', () => {
	it('writes a single cell when no multi-row selection', () => {
		const { api, onChange } = setup()

		api.applyCellWrite(1, 0, 'hello')

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 'b', columnId: 'value', value: 'hello' }])
	})

	it('skips read-only columns', () => {
		const { api, onChange } = setup()

		api.applyCellWrite(0, 1, 'nope')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('skips when the column index is out of range', () => {
		const { api, onChange } = setup()

		api.applyCellWrite(0, 99, 'x')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('skips when the row is missing', () => {
		const { api, onChange } = setup()

		api.applyCellWrite(99, 0, 'x')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('fills the column across all rows in the selection', () => {
		const { api, onChange, setSelection } = setup({
			selection: new Set(['a', 'b']),
		})

		api.applyCellWrite(0, 0, 'bulk')

		expect(onChange).toHaveBeenCalledWith([
			{ rowKey: 'a', columnId: 'value', value: 'bulk' },
			{ rowKey: 'b', columnId: 'value', value: 'bulk' },
		])

		expect(setSelection).toHaveBeenCalledWith(new Set())
	})
})

describe('useEditableGridMutations: applyBulkFill', () => {
	it('returns false when there is no active cell', () => {
		const { api, onChange } = setup({ active: null })

		expect(api.applyBulkFill('x')).toBe(false)

		expect(onChange).not.toHaveBeenCalled()
	})

	it('fills only the active cell when no anchor or extras', () => {
		const { api, onChange } = setup({ active: { row: 0, col: 0 } })

		api.applyBulkFill('active')

		expect(onChange).toHaveBeenCalledWith([{ rowKey: 'a', columnId: 'value', value: 'active' }])
	})

	it('fills every cell in the anchored rectangle', () => {
		const { api, onChange } = setup({
			active: { row: 1, col: 0 },
			anchor: { row: 0, col: 0 },
		})

		api.applyBulkFill('rect')

		expect(onChange).toHaveBeenCalledOnce()

		const changes = onChange.mock.calls[0]?.[0]

		expect(changes).toEqual(
			expect.arrayContaining([
				{ rowKey: 'a', columnId: 'value', value: 'rect' },
				{ rowKey: 'b', columnId: 'value', value: 'rect' },
			]),
		)

		expect(changes).toHaveLength(2)
	})

	it('includes extra cells in the fill', () => {
		const { api, onChange } = setup({
			active: { row: 0, col: 0 },
			extras: new Set(['2,0']),
		})

		api.applyBulkFill('extras')

		const changes = onChange.mock.calls[0]?.[0]

		expect(changes).toEqual([
			{ rowKey: 'a', columnId: 'value', value: 'extras' },
			{ rowKey: 'c', columnId: 'value', value: 'extras' },
		])
	})

	it('skips read-only columns inside the fill range', () => {
		const { api, onChange } = setup({
			active: { row: 0, col: 0 },
			anchor: { row: 0, col: 1 },
		})

		api.applyBulkFill('x')

		const changes = onChange.mock.calls[0]?.[0]

		expect(changes).toEqual([{ rowKey: 'a', columnId: 'value', value: 'x' }])
	})

	it('clears the selection after a successful fill', () => {
		const { api, setSelection } = setup({
			active: { row: 0, col: 0 },
			selection: new Set(['a']),
		})

		api.applyBulkFill('x')

		expect(setSelection).toHaveBeenCalledWith(new Set())
	})

	it('returns true even when no writable cells are targeted', () => {
		const { api, onChange } = setup({
			active: { row: 0, col: 1 }, // read-only only
		})

		expect(api.applyBulkFill('x')).toBe(true)

		expect(onChange).not.toHaveBeenCalled()
	})
})
