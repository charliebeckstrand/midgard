import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridRowGroup } from '../../modules/grid'
import { applyRowKeyOrder } from '../../modules/grid/engine/grid-group/row-manager'
import type { GridRowManagerGroup } from '../../modules/grid/grid-row-group-types'
import { useGridRowManager } from '../../modules/grid/use-grid-row-manager'

/** Three natural-order groups. */
const groups: GridRowManagerGroup[] = [
	{ key: 'a', label: 'A', count: 2 },
	{ key: 'b', label: 'B', count: 1 },
	{ key: 'c', label: 'C', count: 1 },
]

describe('applyRowKeyOrder', () => {
	const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

	const getKey = (item: { id: string }) => item.id

	it('returns the items untouched for an empty or absent order', () => {
		expect(applyRowKeyOrder(items, undefined, getKey)).toBe(items)

		expect(applyRowKeyOrder(items, [], getKey)).toBe(items)
	})

	it('leads with the ordered keys, then the rest in original order', () => {
		expect(applyRowKeyOrder(items, ['c', 'a'], getKey)).toEqual([
			{ id: 'c' },
			{ id: 'a' },
			{ id: 'b' },
		])
	})

	it('skips ordered keys absent from the items', () => {
		expect(applyRowKeyOrder(items, ['z', 'b'], getKey)).toEqual([
			{ id: 'b' },
			{ id: 'a' },
			{ id: 'c' },
		])
	})
})

describe('useGridRowManager', () => {
	const render = (config: GridRowGroup[] | undefined) =>
		renderHook(() => useGridRowManager({ config, naturalGroups: groups }))

	it('is a no-op overlay by default — natural order, no colors, no manual order', () => {
		const { result } = render(undefined)

		expect(result.current.managerGroups.map((g) => g.key)).toEqual(['a', 'b', 'c'])

		expect(result.current.managerGroups.every((g) => g.color === undefined)).toBe(true)

		expect(result.current.presentation.groupOrder).toBeNull()
	})

	it('recolor commits a complete snapshot and reflects the color', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useGridRowManager({ config: { onValueChange }, naturalGroups: groups }),
		)

		act(() => result.current.recolor('b', 'red'))

		// A complete snapshot (an entry per group), only `b` colored.
		expect(onValueChange).toHaveBeenLastCalledWith([
			{ key: 'a' },
			{ key: 'b', color: 'red' },
			{ key: 'c' },
		])

		expect(result.current.presentation.color('b')).toBe('red')
	})

	it('clearing a color drops the field from the snapshot', () => {
		const { result } = render([{ key: 'b', color: 'red' }])

		expect(result.current.presentation.color('b')).toBe('red')

		act(() => result.current.recolor('b', undefined))

		expect(result.current.presentation.color('b')).toBeUndefined()
	})

	it('reorderGroups sets the manual group order once the overlay covers every group', () => {
		const { result } = render(undefined)

		act(() => result.current.reorderGroups(['c', 'a', 'b']))

		expect(result.current.presentation.groupOrder).toEqual(['c', 'a', 'b'])

		expect(result.current.managerGroups.map((g) => g.key)).toEqual(['c', 'a', 'b'])
	})

	it('applies color from a partial overlay but withholds group order until it is complete', () => {
		const { result } = render([{ key: 'b', color: 'blue' }])

		expect(result.current.presentation.color('b')).toBe('blue')

		// The overlay names only `b`, not every group: group order stays natural.
		expect(result.current.presentation.groupOrder).toBeNull()

		expect(result.current.managerGroups.map((g) => g.key)).toEqual(['a', 'b', 'c'])
	})

	it('keeps the color and slot of a group that a filter hides through a commit', () => {
		const onValueChange = vi.fn()

		const { result, rerender } = renderHook(
			({ naturalGroups }) =>
				useGridRowManager({
					config: {
						defaultValue: [{ key: 'c' }, { key: 'a', color: 'red' }, { key: 'b' }],
						onValueChange,
					},
					naturalGroups,
				}),
			{ initialProps: { naturalGroups: groups } },
		)

		// A filter empties `a`, so the view holds `b` and `c` alone.
		rerender({ naturalGroups: groups.filter((group) => group.key !== 'a') })

		act(() => result.current.reorderGroups(['b', 'c']))

		// `b` and `c` fill their two slots in the new order, and `a` holds its own.
		expect(onValueChange).toHaveBeenLastCalledWith([
			{ key: 'b' },
			{ key: 'a', color: 'red' },
			{ key: 'c' },
		])

		// The filter clears, and `a` comes back with its color and in its place.
		rerender({ naturalGroups: groups })

		expect(result.current.presentation.color('a')).toBe('red')

		expect(result.current.presentation.groupOrder).toEqual(['b', 'a', 'c'])
	})
})
