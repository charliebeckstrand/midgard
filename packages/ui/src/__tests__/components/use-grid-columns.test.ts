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

	it('exposes the default manage-columns label as "Columns"', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns, columnManagerConfig: undefined }),
		)

		expect(result.current.manageColumnsLabel).toBe('Columns')
	})

	it('reads manageColumns from columnManagerConfig.enabled', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { enabled: true },
			}),
		)

		expect(result.current.manageColumns).toBe(true)
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

		expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['age', 'name', 'status'])
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

	it('drops a hidden column from visibleColumns', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { defaultHidden: new Set(['age']) },
			}),
		)

		const ids = result.current.visibleColumns.map((c) => c.id)

		expect(ids).not.toContain('age')

		expect(ids).toContain('name')
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

	it('preserves selectable, actions, and pinned columns even when listed as hidden', () => {
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

		const visibleIds = result.current.visibleColumns.map((c) => c.id)

		expect(visibleIds).toContain('select')

		expect(visibleIds).toContain('pinned-status')

		expect(visibleIds).toContain('actions')

		expect(visibleIds).not.toContain('name')
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

	it('honors a custom manage-columns label', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { enabled: true, label: 'Manage' },
			}),
		)

		expect(result.current.manageColumnsLabel).toBe('Manage')
	})

	it('appends columns missing from the stored order at the end', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnOrderConfig: { value: ['name'] },
				columnManagerConfig: undefined,
			}),
		)

		const ids = result.current.visibleColumns.map((c) => c.id)

		expect(ids[0]).toBe('name')

		expect(ids).toContain('age')

		expect(ids).toContain('status')
	})

	it('reuses the previous visibleColumns reference when contents are element-wise identical', () => {
		const { result, rerender } = renderHook(
			({ cols }: { cols: GridColumn<Row>[] }) =>
				useGridColumns<Row>({ columns: cols, columnManagerConfig: undefined }),
			{ initialProps: { cols: columns } },
		)

		const first = result.current.visibleColumns

		// Same columns, new array: still reuses the cached reference.
		rerender({ cols: [...columns] })

		expect(result.current.visibleColumns).toBe(first)
	})

	it('propagates pinned and hideable=false metadata onto managerItems', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (r) => r.name, pinned: true },
			{ id: 'age', title: 'Age', cell: (r) => r.age, hideable: false },
			{ id: 'status', title: 'Status', cell: (r) => r.status },
		]

		const { result } = renderHook(() =>
			useGridColumns<Row>({ columns: cols, columnManagerConfig: { enabled: true } }),
		)

		const items = result.current.managerItems

		const byId = Object.fromEntries(items.map((m) => [m.id, m]))

		expect(byId.name?.pinned).toBe(true)

		expect(byId.age?.hideable).toBe(false)

		expect(byId.status?.pinned).toBeUndefined()

		expect(byId.status?.hideable).toBeUndefined()
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

		expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['age', 'status'])
	})

	it('returns the new visibleColumns reference when the visible slice actually changes', () => {
		const { result, rerender } = renderHook(
			({ hidden }: { hidden: Set<string | number> }) =>
				useGridColumns<Row>({
					columns,
					columnManagerConfig: { hidden },
				}),
			{ initialProps: { hidden: new Set<string | number>() } },
		)

		const first = result.current.visibleColumns

		rerender({ hidden: new Set<string | number>(['age']) })

		expect(result.current.visibleColumns).not.toBe(first)

		expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['name', 'status'])
	})

	it('honors manageColumns=false when columnManagerConfig.enabled is unset', () => {
		const { result } = renderHook(() =>
			useGridColumns<Row>({
				columns,
				columnManagerConfig: { label: 'Anything' },
			}),
		)

		expect(result.current.manageColumns).toBe(false)

		// Custom label still resolves even when the manager is not enabled.
		expect(result.current.manageColumnsLabel).toBe('Anything')
	})
})

describe('useGridColumns column pinning partition', () => {
	type R = { a: string }

	const cell = (r: R) => r.a

	const ids = (cols: GridColumn<R>[]) =>
		renderHook(() =>
			useGridColumns<R>({ columns: cols, columnManagerConfig: undefined }),
		).result.current.visibleColumns.map((c) => c.id)

	it('pulls left-pinned columns to the front in declaration order (true is left)', () => {
		expect(
			ids([
				{ id: 'a', cell },
				{ id: 'b', cell, pinned: 'left' },
				{ id: 'c', cell },
				{ id: 'd', cell, pinned: true },
			]),
		).toEqual(['b', 'd', 'a', 'c'])
	})

	it('pushes right-pinned columns to the end in declaration order', () => {
		expect(
			ids([
				{ id: 'a', cell, pinned: 'right' },
				{ id: 'b', cell },
				{ id: 'c', cell, pinned: 'right' },
				{ id: 'd', cell },
			]),
		).toEqual(['b', 'd', 'a', 'c'])
	})

	it('orders left, then center, then right — each group keeping its order', () => {
		expect(
			ids([
				{ id: 'l1', cell, pinned: 'left' },
				{ id: 'c1', cell },
				{ id: 'r1', cell, pinned: 'right' },
				{ id: 'l2', cell, pinned: 'left' },
				{ id: 'c2', cell },
				{ id: 'r2', cell, pinned: 'right' },
			]),
		).toEqual(['l1', 'l2', 'c1', 'c2', 'r1', 'r2'])
	})

	it('leaves column order untouched when nothing is pinned', () => {
		expect(
			ids([
				{ id: 'a', cell },
				{ id: 'b', cell },
				{ id: 'c', cell },
			]),
		).toEqual(['a', 'b', 'c'])
	})

	it('partitions after the stored order, so a reorder still resolves to the edges', () => {
		const { result } = renderHook(() =>
			useGridColumns<R>({
				columns: [
					{ id: 'a', cell },
					{ id: 'b', cell, pinned: 'left' },
					{ id: 'c', cell },
				],
				// Stored order shuffles the center columns; the pin still wins the edge.
				columnOrderConfig: { value: ['c', 'a', 'b'] },
				columnManagerConfig: undefined,
			}),
		)

		expect(result.current.visibleColumns.map((col) => col.id)).toEqual(['b', 'c', 'a'])
	})
})
