import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	toggleExpandedSet,
	useJsonTreeExpansion,
} from '../../components/json-tree/use-json-tree-expansion'

describe('toggleExpandedSet', () => {
	it('adds a path that was not in the set', () => {
		const onChange = vi.fn()

		toggleExpandedSet(new Set(['a']), 'b', onChange)

		expect(onChange).toHaveBeenCalledWith(new Set(['a', 'b']))
	})

	it('removes a path that is already in the set', () => {
		const onChange = vi.fn()

		toggleExpandedSet(new Set(['a', 'b']), 'a', onChange)

		expect(onChange).toHaveBeenCalledWith(new Set(['b']))
	})

	it('does not mutate the original set', () => {
		const original = new Set(['a'])

		const onChange = vi.fn()

		toggleExpandedSet(original, 'b', onChange)

		expect(original).toEqual(new Set(['a']))
	})
})

describe('useJsonTreeExpansion', () => {
	it('seeds the internal set from initial()', () => {
		const { result } = renderHook(() =>
			useJsonTreeExpansion({
				initial: () => new Set(['root']),
				expanded: undefined,
				onExpandedChange: undefined,
			}),
		)

		expect(result.current.expanded).toEqual(new Set(['root']))
	})

	it('toggles internal state when uncontrolled', () => {
		const { result } = renderHook(() =>
			useJsonTreeExpansion({
				initial: () => new Set(),
				expanded: undefined,
				onExpandedChange: undefined,
			}),
		)

		act(() => {
			result.current.toggle('a')
		})

		expect(result.current.expanded.has('a')).toBe(true)

		act(() => {
			result.current.toggle('a')
		})

		expect(result.current.expanded.has('a')).toBe(false)
	})

	it('uses the controlled expanded set when provided', () => {
		const onExpandedChange = vi.fn()

		const { result } = renderHook(() =>
			useJsonTreeExpansion({
				initial: () => new Set(),
				expanded: new Set(['x']),
				onExpandedChange,
			}),
		)

		expect(result.current.expanded).toEqual(new Set(['x']))

		act(() => {
			result.current.toggle('y')
		})

		expect(onExpandedChange).toHaveBeenCalledWith(new Set(['x', 'y']))
	})

	it('removes an existing controlled path on toggle', () => {
		const onExpandedChange = vi.fn()

		const { result } = renderHook(() =>
			useJsonTreeExpansion({
				initial: () => new Set(),
				expanded: new Set(['x']),
				onExpandedChange,
			}),
		)

		act(() => {
			result.current.toggle('x')
		})

		expect(onExpandedChange).toHaveBeenCalledWith(new Set())
	})

	it('does nothing when controlled and no onExpandedChange is provided', () => {
		const { result } = renderHook(() =>
			useJsonTreeExpansion({
				initial: () => new Set(),
				expanded: new Set(['x']),
				onExpandedChange: undefined,
			}),
		)

		act(() => {
			result.current.toggle('y')
		})

		expect(result.current.expanded).toEqual(new Set(['x']))
	})
})
