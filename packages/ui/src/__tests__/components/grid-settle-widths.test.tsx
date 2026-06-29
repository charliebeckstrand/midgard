import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useColumnSettleWidths } from '../../modules/grid/grid-table-views'
import type { GridColumnResize } from '../../modules/grid/use-grid-table'

/**
 * `useColumnSettleWidths` is the heart of the body cells' resize-truncation
 * re-measure: it hands each column a width snapshot that is frozen to `undefined`
 * while a drag is in flight (so the memoized cells hold frame-to-frame) and the
 * settled engine width otherwise, with a stable reference while unchanged. A
 * change after a settle or a keyboard nudge is what re-renders a column's cells
 * to re-measure overflow.
 */
const columns = [
	{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
	{ id: 'select', selectable: true },
] as unknown as GridColumn<{ name: string }>[]

function makeResize(widths: Record<string, number>): GridColumnResize {
	return {
		getSize: (id: string | number) => widths[String(id)] ?? 0,
	} as unknown as GridColumnResize
}

describe('useColumnSettleWidths', () => {
	it('freezes every column to undefined while a drag is in flight', () => {
		const { result } = renderHook(() =>
			useColumnSettleWidths(columns, makeResize({ name: 200 }), true),
		)

		expect(result.current).toEqual([undefined, undefined])
	})

	it('reports the settled engine width per data column at rest, undefined for non-data', () => {
		const { result } = renderHook(() =>
			useColumnSettleWidths(columns, makeResize({ name: 200 }), false),
		)

		// `name` is a data column; the selection column carries no truncation.
		expect(result.current).toEqual([200, undefined])
	})

	it('is undefined throughout when the grid is not resizable', () => {
		const { result } = renderHook(() => useColumnSettleWidths(columns, null, false))

		expect(result.current).toEqual([undefined, undefined])
	})

	it('holds a stable reference while the widths are unchanged (no per-frame churn)', () => {
		const resize = makeResize({ name: 200 })

		const { result, rerender } = renderHook(
			({ resizing }) => useColumnSettleWidths(columns, resize, resizing),
			{ initialProps: { resizing: false } },
		)

		const first = result.current

		rerender({ resizing: false })

		expect(result.current).toBe(first)
	})

	it('yields a fresh snapshot when a column width changes (a nudge)', () => {
		const { result, rerender } = renderHook(
			({ resize }) => useColumnSettleWidths(columns, resize, false),
			{ initialProps: { resize: makeResize({ name: 200 }) } },
		)

		const first = result.current

		// A keyboard nudge moves the engine width with no drag.
		rerender({ resize: makeResize({ name: 240 }) })

		expect(result.current).not.toBe(first)
		expect(result.current).toEqual([240, undefined])
	})

	it('thaws from the drag freeze to the settled width when resizing ends', () => {
		const resize = makeResize({ name: 160 })

		const { result, rerender } = renderHook(
			({ resizing }) => useColumnSettleWidths(columns, resize, resizing),
			{ initialProps: { resizing: true } },
		)

		expect(result.current).toEqual([undefined, undefined])

		rerender({ resizing: false })

		expect(result.current).toEqual([160, undefined])
	})
})
