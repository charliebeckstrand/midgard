import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridColumns } from '../../modules/grid/use-grid-columns'

type Row = { name: string; age: number; status: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (r) => r.name },
	{ id: 'age', title: 'Age', cell: (r) => r.age },
	{ id: 'status', title: 'Status', cell: (r) => r.status },
]

describe('useGridColumns', () => {
	it('defaults columnOrder to the column ids in declaration order', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns, columnManagerConfig: undefined }),
		)

		expect(result.current.columnOrder).toEqual(['name', 'age', 'status'])
	})

	it('exposes empty hidden set by default', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns, columnManagerConfig: undefined }),
		)

		expect(result.current.hiddenColumns.size).toBe(0)
	})

	it('honors a controlled order from columnOrderConfig.value', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnOrderConfig: { value: ['age', 'name', 'status'] },
				columnManagerConfig: undefined,
			}),
		)

		expect(result.current.columnOrder).toEqual(['age', 'name', 'status'])
	})

	it('uses columnOrderConfig.defaultValue when no controlled order is supplied', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnOrderConfig: { defaultValue: ['status', 'name', 'age'] },
				columnManagerConfig: undefined,
			}),
		)

		expect(result.current.columnOrder).toEqual(['status', 'name', 'age'])
	})

	it('marks a hidden column false in the engine columnVisibility map', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { defaultHidden: new Set(['age']) },
			}),
		)

		// Only hidden columns appear (false); the rest default to visible (absent).
		expect(result.current.columnVisibility).toEqual({ age: false })
	})

	it('fires onHiddenChange when setHiddenColumns is called', () => {
		const onHiddenChange = vi.fn()

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { onHiddenChange, defaultHidden: new Set() },
			}),
		)

		act(() => {
			result.current.setHiddenColumns(new Set(['age']))
		})

		expect(onHiddenChange).toHaveBeenCalledWith(new Set(['age']))
	})

	it('fires columnOrderConfig.onValueChange when setColumnOrder is called', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnOrderConfig: { onValueChange },
				columnManagerConfig: undefined,
			}),
		)

		act(() => {
			result.current.setColumnOrder(['status', 'age', 'name'])
		})

		expect(onValueChange).toHaveBeenCalledWith(['status', 'age', 'name'])
	})

	it('reorderColumns splices the reordered visible data columns into the full order', () => {
		const onValueChange = vi.fn()

		const cols: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (r) => r.name },
			{ id: 'age', title: 'Age', cell: (r) => r.age },
			{ id: 'status', title: 'Status', cell: (r) => r.status },
		]

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns: cols,
				columnOrderConfig: { onValueChange },
				columnManagerConfig: undefined,
			}),
		)

		// Drag swaps the first and last visible data columns ("name" and
		// "status"); the selection column holds its slot.
		act(() => {
			result.current.reorderColumns(['status', 'age', 'name'])
		})

		expect(onValueChange).toHaveBeenCalledWith(['select', 'status', 'age', 'name'])
	})

	it('keeps selectable, actions, and pinned columns out of the hidden map even when listed as hidden', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (r) => r.name },
			{ id: 'pinned-status', title: 'Status', cell: (r) => r.status, pinned: true },
			{
				id: 'actions',
				actions: (r) => r.name,
			},
		]

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns: cols,
				columnManagerConfig: {
					enabled: true,
					defaultHidden: new Set(['select', 'name', 'pinned-status', 'actions']),
				},
			}),
		)

		// Only the hideable data column ('name') is marked hidden; selection,
		// actions, and pinned columns always stay visible (absent from the map).
		expect(result.current.columnVisibility).toEqual({ name: false })
	})

	it('excludes selectable and actions columns from managerItems', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (r) => r.name },
			{
				id: 'actions',
				actions: (r) => r.name,
			},
		]

		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns: cols, columnManagerConfig: { enabled: true } }),
		)

		const ids = result.current.managerItems.map((m) => m.id)

		expect(ids).toEqual(['name'])
	})

	it('defaults managerItems title to the id when no title is set', () => {
		const cols: GridColumn<Row>[] = [{ id: 'name', cell: (r) => r.name }]

		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns: cols, columnManagerConfig: { enabled: true } }),
		)

		expect(result.current.managerItems[0]?.title).toBe('name')
	})

	it('propagates the pin side, lock side, and hideable=false metadata onto managerItems', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (r) => r.name, pinned: true },
			{ id: 'age', title: 'Age', cell: (r) => r.age, hideable: false },
			{ id: 'status', title: 'Status', cell: (r) => r.status, locked: 'right' },
		]

		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns: cols, columnManagerConfig: { enabled: true } }),
		)

		const items = result.current.managerItems

		const byId = Object.fromEntries(items.map((m) => [m.id, m]))

		// `pinned: true` normalizes to the 'left' side; an unpinned column omits it.
		expect(byId.name?.pinned).toBe('left')

		expect(byId.name?.locked).toBeUndefined()

		expect(byId.age?.hideable).toBe(false)

		// A locked column carries its lock side and no movable pin side.
		expect(byId.status?.locked).toBe('right')

		expect(byId.status?.pinned).toBeUndefined()

		expect(byId.status?.hideable).toBeUndefined()
	})

	it('keeps a locked column out of the hidden map and holds it in place on reorder', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (r) => r.name, locked: 'left' },
			{ id: 'age', title: 'Age', cell: (r) => r.age },
			{ id: 'status', title: 'Status', cell: (r) => r.status },
		]

		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns: cols,
				columnOrderConfig: { onValueChange },
				// The locked column is listed as hidden but always shows: it's excluded
				// from the visibility map, like a pinned column.
				columnManagerConfig: { enabled: true, defaultHidden: new Set(['name']) },
			}),
		)

		expect(result.current.columnVisibility).toEqual({})

		// A reorder of the scrolling columns holds the locked column in its slot.
		act(() => {
			result.current.reorderColumns(['status', 'age'])
		})

		expect(onValueChange).toHaveBeenCalledWith(['name', 'status', 'age'])
	})

	it('reflects a controlled hidden set even when defaultHidden is also supplied', () => {
		const hidden = new Set<string | number>(['name'])

		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { hidden, defaultHidden: new Set(['age']) },
			}),
		)

		// Controlled `hidden` wins; only "name" is hidden.
		expect(result.current.hiddenColumns.has('name')).toBe(true)

		expect(result.current.hiddenColumns.has('age')).toBe(false)

		expect(result.current.columnVisibility).toEqual({ name: false })
	})
})
