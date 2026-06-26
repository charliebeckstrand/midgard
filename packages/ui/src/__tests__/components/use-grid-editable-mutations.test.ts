import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
	Coord,
	GridEditableColumn,
	GridEditableNavigationApi,
} from '../../modules/grid/grid-editable-types'
import { useGridEditableMutations } from '../../modules/grid/use-grid-editable-mutations'

type Row = { id: string; value: string }

const cols: GridEditableColumn<Row>[] = [
	{ id: 'value', title: 'Value' } as GridEditableColumn<Row>,
	{ id: 'readonly', title: 'RO', readOnly: true } as GridEditableColumn<Row>,
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

	const onValueChange = vi.fn()

	const partialNav: Partial<GridEditableNavigationApi> = {
		activeRef: { current: options.active ?? null },
		anchorRef: { current: options.anchor ?? null },
		extraCellsRef: { current: options.extras ?? new Set() },
	}

	const nav = partialNav as GridEditableNavigationApi

	const { result } = renderHook(() =>
		useGridEditableMutations<Row>({
			nav,
			rows: {
				rowsRef: { current: rows },
				editableCols: cols,
				getKey: (r) => r.id,
				formatCell: () => '',
				parseValue: (raw: string) => raw,
			},
			selection: {
				selectionRef: { current: options.selection ?? new Set() },
			},
			onValueChange,
		}),
	)

	return { api: result.current, onValueChange }
}

describe('useGridEditableMutations: applyCellWrite', () => {
	it('writes a single cell when no multi-row selection', () => {
		const { api, onValueChange } = setup()

		api.applyCellWrite(1, 0, 'hello')

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 'b', columnId: 'value', value: 'hello' }])
	})

	it('skips read-only columns', () => {
		const { api, onValueChange } = setup()

		api.applyCellWrite(0, 1, 'nope')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('skips when the column index is out of range', () => {
		const { api, onValueChange } = setup()

		api.applyCellWrite(0, 99, 'x')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('skips when the row is missing', () => {
		const { api, onValueChange } = setup()

		api.applyCellWrite(99, 0, 'x')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('fills the column across all rows in the selection', () => {
		const { api, onValueChange } = setup({
			selection: new Set(['a', 'b']),
		})

		api.applyCellWrite(0, 0, 'bulk')

		expect(onValueChange).toHaveBeenCalledWith([
			{ rowKey: 'a', columnId: 'value', value: 'bulk' },
			{ rowKey: 'b', columnId: 'value', value: 'bulk' },
		])
	})
})

describe('useGridEditableMutations: applyBulkFill', () => {
	it('returns false when there is no active cell', () => {
		const { api, onValueChange } = setup({ active: null })

		expect(api.applyBulkFill('x')).toBe(false)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('fills only the active cell when no anchor or extras', () => {
		const { api, onValueChange } = setup({ active: { row: 0, col: 0 } })

		api.applyBulkFill('active')

		expect(onValueChange).toHaveBeenCalledWith([
			{ rowKey: 'a', columnId: 'value', value: 'active' },
		])
	})

	it('fills every cell in the anchored rectangle', () => {
		const { api, onValueChange } = setup({
			active: { row: 1, col: 0 },
			anchor: { row: 0, col: 0 },
		})

		api.applyBulkFill('rect')

		expect(onValueChange).toHaveBeenCalledOnce()

		const changes = onValueChange.mock.calls[0]?.[0]

		expect(changes).toEqual(
			expect.arrayContaining([
				{ rowKey: 'a', columnId: 'value', value: 'rect' },
				{ rowKey: 'b', columnId: 'value', value: 'rect' },
			]),
		)

		expect(changes).toHaveLength(2)
	})

	it('includes extra cells in the fill', () => {
		const { api, onValueChange } = setup({
			active: { row: 0, col: 0 },
			extras: new Set(['2,0']),
		})

		api.applyBulkFill('extras')

		const changes = onValueChange.mock.calls[0]?.[0]

		expect(changes).toEqual([
			{ rowKey: 'a', columnId: 'value', value: 'extras' },
			{ rowKey: 'c', columnId: 'value', value: 'extras' },
		])
	})

	it('skips read-only columns inside the fill range', () => {
		const { api, onValueChange } = setup({
			active: { row: 0, col: 0 },
			anchor: { row: 0, col: 1 },
		})

		api.applyBulkFill('x')

		const changes = onValueChange.mock.calls[0]?.[0]

		expect(changes).toEqual([{ rowKey: 'a', columnId: 'value', value: 'x' }])
	})

	it('returns true even when no writable cells are targeted', () => {
		const { api, onValueChange } = setup({
			active: { row: 0, col: 1 }, // read-only only
		})

		expect(api.applyBulkFill('x')).toBe(true)

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
