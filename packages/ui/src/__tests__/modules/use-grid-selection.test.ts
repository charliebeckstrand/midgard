import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridSelection } from '../../modules/grid'
import {
	useGridSelectionActions,
	useGridSelectionState,
} from '../../modules/grid/use-grid-selection'

/**
 * The selection state and its actions over `rowKeys`, composed as `GridData`
 * composes them on each side of the engine.
 */
function useGridSelection<T>({
	selectionConfig,
	rowKeys,
	rows = [],
}: {
	selectionConfig: GridSelection<T> | undefined
	rowKeys: (string | number)[]
	rows?: readonly T[]
}) {
	const state = useGridSelectionState(selectionConfig)

	const actions = useGridSelectionActions({
		...state,
		rowKeys,
		rows,
		rowSelectable: selectionConfig?.rowSelectable,
	})

	return { ...state, ...actions }
}

describe('useGridSelection', () => {
	it('starts with an empty selection by default', () => {
		const { result } = renderHook(() =>
			useGridSelection({ selectionConfig: undefined, rowKeys: ['a', 'b'] }),
		)

		expect(result.current.selection.size).toBe(0)

		expect(result.current.allSelected).toBe(false)

		expect(result.current.someSelected).toBe(false)
	})

	it('seeds with the configured defaultValue', () => {
		const { result } = renderHook(() =>
			useGridSelection({
				selectionConfig: { defaultValue: new Set(['a']) },
				rowKeys: ['a', 'b'],
			}),
		)

		expect(result.current.selection.has('a')).toBe(true)

		expect(result.current.someSelected).toBe(true)

		expect(result.current.allSelected).toBe(false)
	})

	it('reports allSelected when every row key is present', () => {
		const { result } = renderHook(() =>
			useGridSelection({
				selectionConfig: { defaultValue: new Set(['a', 'b']) },
				rowKeys: ['a', 'b'],
			}),
		)

		expect(result.current.allSelected).toBe(true)

		expect(result.current.someSelected).toBe(true)
	})

	it('toggles a single row on and off via toggleRow', () => {
		const { result } = renderHook(() =>
			useGridSelection({ selectionConfig: undefined, rowKeys: ['a', 'b'] }),
		)

		act(() => {
			result.current.toggleRow('a')
		})

		expect(result.current.selection.has('a')).toBe(true)

		act(() => {
			result.current.toggleRow('a')
		})

		expect(result.current.selection.has('a')).toBe(false)
	})

	it('selects everything when toggleAll is called from an empty state', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useGridSelection({
				selectionConfig: { onValueChange },
				rowKeys: ['a', 'b', 'c'],
			}),
		)

		act(() => {
			result.current.toggleAll()
		})

		expect(result.current.selection).toEqual(new Set(['a', 'b', 'c']))

		expect(onValueChange).toHaveBeenCalledWith(new Set(['a', 'b', 'c']))
	})

	it('clears the selection when toggleAll is called with everything selected', () => {
		const { result } = renderHook(() =>
			useGridSelection({
				selectionConfig: { defaultValue: new Set(['a', 'b']) },
				rowKeys: ['a', 'b'],
			}),
		)

		act(() => {
			result.current.toggleAll()
		})

		expect(result.current.selection.size).toBe(0)
	})

	it('fires onValueChange when toggling', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useGridSelection({
				selectionConfig: { onValueChange },
				rowKeys: ['a'],
			}),
		)

		act(() => {
			result.current.toggleRow('a')
		})

		expect(onValueChange).toHaveBeenCalledWith(new Set(['a']))
	})
})

describe('useGridSelection span and rowSelectable', () => {
	type Row = { id: string; locked?: boolean }

	const rows: Row[] = [
		{ id: 'a' },
		{ id: 'b' },
		{ id: 'c', locked: true },
		{ id: 'd' },
		{ id: 'e' },
	]

	const rowKeys = rows.map((row) => row.id)

	const render = (rowSelectable?: (row: Row) => boolean) =>
		renderHook(() =>
			useGridSelection<Row>({
				selectionConfig: { rowSelectable },
				rowKeys,
				rows,
			}),
		)

	it('selects each row between the last toggled row and this one on a span', () => {
		const { result } = render()

		act(() => result.current.toggleRow('b'))

		act(() => result.current.toggleRow('e', true))

		expect([...result.current.selection].sort()).toEqual(['b', 'c', 'd', 'e'])
	})

	it('runs a span upward, and clears it when the row it names was selected', () => {
		const { result } = render()

		act(() => result.current.toggleRow('d'))

		act(() => result.current.toggleRow('a', true))

		expect([...result.current.selection].sort()).toEqual(['a', 'b', 'c', 'd'])

		// `b` is selected, so the span from `a` to `b` clears both.
		act(() => result.current.toggleRow('b', true))

		expect([...result.current.selection].sort()).toEqual(['c', 'd'])
	})

	it('toggles one row on a span with no row toggled before', () => {
		const { result } = render()

		act(() => result.current.toggleRow('c', true))

		expect([...result.current.selection]).toEqual(['c'])
	})

	it('rejects a row that rowSelectable refuses, in a toggle, a span, and select-all', () => {
		const { result } = render((row) => !row.locked)

		expect([...result.current.unselectable]).toEqual(['c'])

		act(() => result.current.toggleRow('c'))

		expect(result.current.selection.size).toBe(0)

		act(() => result.current.toggleRow('a'))

		act(() => result.current.toggleRow('e', true))

		expect([...result.current.selection].sort()).toEqual(['a', 'b', 'd', 'e'])

		// Every row that can take the selection holds it.
		expect(result.current.allSelected).toBe(true)

		act(() => result.current.toggleAll())

		expect(result.current.selection.size).toBe(0)

		act(() => result.current.toggleAll())

		expect([...result.current.selection].sort()).toEqual(['a', 'b', 'd', 'e'])
	})

	it('keeps the set of rejected keys while its keys stay the same', () => {
		const { result, rerender } = renderHook(
			({ rowSelectable }) =>
				useGridSelection<Row>({ selectionConfig: { rowSelectable }, rowKeys, rows }),
			{ initialProps: { rowSelectable: (row: Row) => !row.locked } },
		)

		const first = result.current.unselectable

		// A new function with the same answer, as an inline prop gives on each render.
		rerender({ rowSelectable: (row: Row) => !row.locked })

		expect(result.current.unselectable).toBe(first)
	})
})
