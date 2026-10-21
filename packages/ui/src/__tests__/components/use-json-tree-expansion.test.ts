import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { JsonValue } from '../../components/json-tree'
import { flattenTree } from '../../components/json-tree/json-tree-utilities'
import {
	unionExpandedSet,
	useJsonTreeExpansion,
} from '../../components/json-tree/use-json-tree-expansion'

describe('unionExpandedSet', () => {
	it('adds the paths that are not in the set', () => {
		expect(unionExpandedSet(new Set(['$']), new Set(['$', '$.a']))).toEqual(new Set(['$', '$.a']))
	})

	// A union that adds no path reports nothing, so the seed does not call onExpandedChange.
	it('returns undefined when the set holds each path', () => {
		expect(unionExpandedSet(new Set(['$', '$.a']), new Set(['$.a']))).toBeUndefined()
	})

	it('does not mutate the original set', () => {
		const original = new Set(['a'])

		unionExpandedSet(original, new Set(['b']))

		expect(original).toEqual(new Set(['a']))
	})
})

type Options = Parameters<typeof useJsonTreeExpansion>[0]

const uncontrolled: Options = {
	expanded: undefined,
	onExpandedChange: undefined,
	defaultExpandDepth: 1,
}

describe('useJsonTreeExpansion', () => {
	describe('uncontrolled', () => {
		it('resolves the depth default per render, with no seed', () => {
			const { result } = renderHook(() => useJsonTreeExpansion(uncontrolled))

			expect(result.current.isOpen('$', 0)).toBe(true)

			expect(result.current.isOpen('$.a', 1)).toBe(false)
		})

		it('opens an auto-open path below the depth default', () => {
			const { result } = renderHook(() =>
				useJsonTreeExpansion({ ...uncontrolled, autoOpen: new Set(['$.a']) }),
			)

			expect(result.current.isOpen('$.a', 1)).toBe(true)

			expect(result.current.isOpen('$.b', 1)).toBe(false)
		})

		it('keeps a user toggle over the default rules', () => {
			const { result } = renderHook(() =>
				useJsonTreeExpansion({ ...uncontrolled, autoOpen: new Set(['$.a']) }),
			)

			act(() => {
				result.current.toggle('$', true)
			})

			act(() => {
				result.current.toggle('$.a', true)
			})

			act(() => {
				result.current.toggle('$.b', false)
			})

			expect(result.current.isOpen('$', 0)).toBe(false)

			expect(result.current.isOpen('$.a', 1)).toBe(false)

			expect(result.current.isOpen('$.b', 1)).toBe(true)
		})

		it('does not report a toggle, because the callback is for controlled mode', () => {
			const onExpandedChange = vi.fn()

			const { result } = renderHook(() =>
				useJsonTreeExpansion({ ...uncontrolled, onExpandedChange }),
			)

			act(() => {
				result.current.toggle('$', true)
			})

			expect(onExpandedChange).not.toHaveBeenCalled()
		})

		// B06-C12: the old hook seeded the open set once, from the first `data`.
		// A null placeholder gave an empty seed, and the payload rendered collapsed.
		it('opens the payload to the depth default after a null placeholder', () => {
			const { result, rerender } = renderHook(
				({ data }: { data: JsonValue }) => {
					const { isOpen } = useJsonTreeExpansion(uncontrolled)

					return flattenTree({
						data,
						rootKey: undefined,
						isOpen,
						search: '',
						filter: false,
						searchIndex: new WeakMap(),
					})
				},
				{ initialProps: { data: null as JsonValue } },
			)

			rerender({ data: { a: { b: 1 } } })

			expect(result.current[0]).toMatchObject({ type: 'branch-open', path: '$', open: true })

			expect(result.current[1]).toMatchObject({ type: 'branch-open', path: '$.a', open: false })
		})
	})

	describe('controlled', () => {
		it('resolves open state from the controlled set alone', () => {
			const { result } = renderHook(() =>
				useJsonTreeExpansion({
					expanded: new Set(['$.a']),
					onExpandedChange: vi.fn(),
					defaultExpandDepth: 1,
					autoOpen: new Set(['$.b']),
				}),
			)

			expect(result.current.isOpen('$', 0)).toBe(false)

			expect(result.current.isOpen('$.a', 1)).toBe(true)

			expect(result.current.isOpen('$.b', 1)).toBe(false)
		})

		it('reports a toggle that adds a path', () => {
			const onExpandedChange = vi.fn()

			const { result } = renderHook(() =>
				useJsonTreeExpansion({
					expanded: new Set(['x']),
					onExpandedChange,
					defaultExpandDepth: 1,
				}),
			)

			act(() => {
				result.current.toggle('y', false)
			})

			expect(onExpandedChange).toHaveBeenCalledWith(new Set(['x', 'y']))
		})

		it('reports a toggle that removes a path', () => {
			const onExpandedChange = vi.fn()

			const { result } = renderHook(() =>
				useJsonTreeExpansion({
					expanded: new Set(['x']),
					onExpandedChange,
					defaultExpandDepth: 1,
				}),
			)

			act(() => {
				result.current.toggle('x', true)
			})

			expect(onExpandedChange).toHaveBeenCalledWith(new Set())
		})

		it('does nothing when no onExpandedChange is provided', () => {
			const { result } = renderHook(() =>
				useJsonTreeExpansion({
					expanded: new Set(['x']),
					onExpandedChange: undefined,
					defaultExpandDepth: 1,
				}),
			)

			act(() => {
				result.current.toggle('y', false)
			})

			expect(result.current.isOpen('y', 0)).toBe(false)
		})
	})
})
