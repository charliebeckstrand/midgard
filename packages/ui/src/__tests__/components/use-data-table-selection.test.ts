import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDataTableSelection } from '../../components/data-table/use-data-table-selection'

describe('useDataTableSelection', () => {
	it('starts with an empty selection by default', () => {
		const { result } = renderHook(() =>
			useDataTableSelection({ selectionConfig: undefined, rowKeys: ['a', 'b'] }),
		)

		expect(result.current.selection.size).toBe(0)

		expect(result.current.allSelected).toBe(false)

		expect(result.current.someSelected).toBe(false)
	})

	it('seeds with the configured defaultValue', () => {
		const { result } = renderHook(() =>
			useDataTableSelection({
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
			useDataTableSelection({
				selectionConfig: { defaultValue: new Set(['a', 'b']) },
				rowKeys: ['a', 'b'],
			}),
		)

		expect(result.current.allSelected).toBe(true)

		expect(result.current.someSelected).toBe(true)
	})

	it('toggles a single row on and off via toggleRow', () => {
		const { result } = renderHook(() =>
			useDataTableSelection({ selectionConfig: undefined, rowKeys: ['a', 'b'] }),
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
			useDataTableSelection({
				selectionConfig: { onValueChange },
				rowKeys: ['a', 'b', 'c'],
			}),
		)

		act(() => {
			result.current.toggleAll()
		})

		expect(result.current.selection.has('a')).toBe(true)

		expect(result.current.selection.has('b')).toBe(true)

		expect(result.current.selection.has('c')).toBe(true)
	})

	it('clears the selection when toggleAll is called with everything selected', () => {
		const { result } = renderHook(() =>
			useDataTableSelection({
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
			useDataTableSelection({
				selectionConfig: { onValueChange },
				rowKeys: ['a'],
			}),
		)

		act(() => {
			result.current.toggleRow('a')
		})

		expect(onValueChange).toHaveBeenCalled()
	})
})
