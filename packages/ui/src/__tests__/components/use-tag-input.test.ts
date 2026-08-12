import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTagInput } from '../../components/tag-input/use-tag-input'

describe('useTagInput', () => {
	it('starts with the defaultValue (or empty array)', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['alpha'] }))

		expect(result.current.tags).toEqual(['alpha'])

		const empty = renderHook(() => useTagInput({}))

		expect(empty.result.current.tags).toEqual([])
	})

	/**
	 * `addTags` returns the tokens `validate` REFUSED, not a success flag — those are the ones the field
	 * puts back in the draft for the user to fix. A duplicate or an over-cap token is refused too but
	 * comes back empty, because neither is something anyone retypes. So the outcome to assert is the
	 * resulting tag list; `rejected` is asserted only where it carries information.
	 */
	it.each<[string, Parameters<typeof useTagInput>[0], string[], string[]]>([
		['appends a novel tag', { defaultValue: ['a'] }, ['b'], ['a', 'b']],
		['trims whitespace and skips empty input', { defaultValue: [] }, ['   '], []],
		['skips duplicates already held', { defaultValue: ['a'] }, ['a'], ['a']],
		['skips a duplicate repeated inside one batch', { defaultValue: [] }, ['a', 'a'], ['a']],
		[
			'commits a whole batch in one transaction',
			{ defaultValue: [] },
			['a', 'b', 'c'],
			['a', 'b', 'c'],
		],
	])('%s', (_name, options, input, expectedTags) => {
		const { result } = renderHook(() => useTagInput(options))

		act(() => {
			result.current.addTags(input)
		})

		expect(result.current.tags).toEqual(expectedTags)
	})

	it('honors the max cap, surfaces atMax, and fills only the remaining room', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['a'], max: 2 }))

		let rejected: string[] = ['unset']

		act(() => {
			rejected = result.current.addTags(['b', 'c'])
		})

		// One slot left, so 'b' lands and 'c' is refused for room — not returned, since the cap is a
		// limit the field itself shows rather than a token to retype.
		expect(result.current.tags).toEqual(['a', 'b'])

		expect(rejected).toEqual([])

		expect(result.current.atMax).toBe(true)
	})

	it('returns the tokens a custom validator refused, and commits the rest', () => {
		const validate = vi.fn((tag: string) => tag.length > 2)

		const { result } = renderHook(() => useTagInput({ defaultValue: [], validate }))

		let rejected: string[] = []

		act(() => {
			rejected = result.current.addTags(['hi', 'there', 'no'])
		})

		// The batch is not all-or-nothing: a mistyped code in a list of forty must not discard the
		// thirty-nine good ones.
		expect(result.current.tags).toEqual(['there'])

		expect(rejected).toEqual(['hi', 'no'])

		expect(validate).toHaveBeenCalledWith('hi')
	})

	it('removeTag drops the entry at the given index', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['a', 'b', 'c'] }))

		act(() => {
			result.current.removeTag(1)
		})

		expect(result.current.tags).toEqual(['a', 'c'])
	})

	it('calls onValueChange with the next tags when a tag is added', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useTagInput({ defaultValue: [], onValueChange }))

		act(() => {
			result.current.addTags(['react'])
		})

		expect(onValueChange).toHaveBeenCalledWith(['react'])
	})

	it('does not call onValueChange when an add is rejected', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useTagInput({ defaultValue: [], onValueChange }))

		act(() => {
			result.current.addTags(['   '])
		})

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
