import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * Column order, visibility, and pinning now resolve on the engine: `useGridTable`
 * receives the full column set plus `columnOrder` / `columnVisibility` state and
 * returns the rendered `visibleColumns` (the engine's visible leaf columns in
 * pinned-edge order). These cover that derivation — the behaviour that used to
 * live in the bespoke `buildVisibleColumns` / `partitionByPin`.
 */
describe('useGridTable column resolution', () => {
	type Row = { id: number; a: string; b: string; c: string; d: string }

	const cell = (key: keyof Row) => (row: Row) => String(row[key])

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: cell('a') },
		{ id: 'b', title: 'B', cell: cell('b') },
		{ id: 'c', title: 'C', cell: cell('c') },
		{ id: 'd', title: 'D', cell: cell('d') },
	]

	const rows: Row[] = [{ id: 1, a: 'a', b: 'b', c: 'c', d: 'd' }]

	const getKey = (row: Row) => row.id

	const visibleIds = (
		cols: GridColumn<Row>[],
		extra?: Partial<Parameters<typeof useGridTable<Row>>[0]>,
	) =>
		renderHook(() =>
			useGridTable<Row>({ rows, columns: cols, getKey, ...extra }),
		).result.current.visibleColumns.map((col) => col.id)

	it('orders the rendered columns by columnOrder', () => {
		expect(visibleIds(columns, { columnOrder: ['c', 'a', 'b', 'd'] })).toEqual(['c', 'a', 'b', 'd'])
	})

	it('appends columns missing from columnOrder in definition order', () => {
		expect(visibleIds(columns, { columnOrder: ['c'] })).toEqual(['c', 'a', 'b', 'd'])
	})

	it('drops columns marked hidden in columnVisibility', () => {
		expect(visibleIds(columns, { columnVisibility: { b: false } })).toEqual(['a', 'c', 'd'])
	})

	it('pulls left-pinned columns to the front, right-pinned to the end', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'a', title: 'A', cell: cell('a'), pinned: 'right' },
			{ id: 'b', title: 'B', cell: cell('b'), pinned: 'left' },
			{ id: 'c', title: 'C', cell: cell('c') },
			{ id: 'd', title: 'D', cell: cell('d'), pinned: true },
		]

		// Left (b, d) first in order, then the scrolling column (c), then right (a).
		expect(visibleIds(cols)).toEqual(['b', 'd', 'c', 'a'])
	})

	it('freezes locked columns to their edge alongside pinned ones', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'a', title: 'A', cell: cell('a'), locked: 'right' },
			{ id: 'b', title: 'B', cell: cell('b'), locked: 'left' },
			{ id: 'c', title: 'C', cell: cell('c') },
			{ id: 'd', title: 'D', cell: cell('d'), pinned: 'left' },
		]

		// Left edge holds the left-frozen columns (b locked, d pinned), then the
		// scrolling column (c), then the right-locked column (a).
		expect(visibleIds(cols)).toEqual(['b', 'd', 'c', 'a'])
	})

	it('pulls the selection column to the far left, ahead of a left-pinned column', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'a', title: 'A', cell: cell('a') },
			{ id: 'b', title: 'B', cell: cell('b') },
			{ id: 'c', title: 'C', cell: cell('c'), pinned: 'left' },
			{ id: 'd', title: 'D', cell: cell('d') },
		]

		// The checkbox column leads the left edge; the pinned column (c) follows it,
		// then the scrolling columns in order.
		expect(visibleIds(cols)).toEqual(['select', 'c', 'a', 'b', 'd'])
	})

	it('anchors the selection column left even when only a right column is pinned', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'a', title: 'A', cell: cell('a') },
			{ id: 'b', title: 'B', cell: cell('b'), pinned: 'right' },
			{ id: 'c', title: 'C', cell: cell('c') },
		]

		// Selection frozen far left, b frozen right, a and c scrolling between them.
		expect(visibleIds(cols)).toEqual(['select', 'a', 'c', 'b'])
	})

	it('keeps a hidden column out and pinned columns at their edge together', () => {
		const cols: GridColumn<Row>[] = [
			{ id: 'a', title: 'A', cell: cell('a') },
			{ id: 'b', title: 'B', cell: cell('b'), pinned: 'right' },
			{ id: 'c', title: 'C', cell: cell('c') },
			{ id: 'd', title: 'D', cell: cell('d') },
		]

		expect(visibleIds(cols, { columnVisibility: { c: false } })).toEqual(['a', 'd', 'b'])
	})

	it('holds a stable visibleColumns reference across renders with identical contents', () => {
		const { result, rerender } = renderHook(
			({ cols }: { cols: GridColumn<Row>[] }) => useGridTable<Row>({ rows, columns: cols, getKey }),
			{ initialProps: { cols: columns } },
		)

		const first = result.current.visibleColumns

		// Same column objects, fresh array: the derived list reuses its reference.
		rerender({ cols: [...columns] })

		expect(result.current.visibleColumns).toBe(first)
	})
})
