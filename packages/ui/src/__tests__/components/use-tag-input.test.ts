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

	it.each<[string, Parameters<typeof useTagInput>[0], string, boolean, string[]]>([
		['addTag appends and returns true on success', { defaultValue: ['a'] }, 'b', true, ['a', 'b']],
		['addTag trims whitespace and rejects empty input', { defaultValue: [] }, '   ', false, []],
		['addTag rejects duplicates', { defaultValue: ['a'] }, 'a', false, ['a']],
	])('%s', (_name, options, input, expectedOk, expectedTags) => {
		const { result } = renderHook(() => useTagInput(options))

		let ok = false

		act(() => {
			ok = result.current.addTag(input)
		})

		expect(ok).toBe(expectedOk)

		expect(result.current.tags).toEqual(expectedTags)
	})

	it('addTag honors the max cap and surfaces atMax', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['a', 'b'], max: 2 }))

		expect(result.current.atMax).toBe(true)

		let ok = true

		act(() => {
			ok = result.current.addTag('c')
		})

		expect(ok).toBe(false)

		expect(result.current.tags).toEqual(['a', 'b'])
	})

	it('addTag honors a custom validator', () => {
		const validate = vi.fn((tag: string) => tag.length > 2)

		const { result } = renderHook(() => useTagInput({ defaultValue: [], validate }))

		let ok = true

		act(() => {
			ok = result.current.addTag('hi')
		})

		expect(ok).toBe(false)

		expect(validate).toHaveBeenCalledWith('hi')

		expect(result.current.tags).toEqual([])
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
			result.current.addTag('react')
		})

		expect(onValueChange).toHaveBeenCalledWith(['react'])
	})

	it('does not call onValueChange when an add is rejected', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useTagInput({ defaultValue: [], onValueChange }))

		act(() => {
			result.current.addTag('   ')
		})

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
