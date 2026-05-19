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

	it('addTag appends and returns true on success', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['a'] }))

		let ok = false

		act(() => {
			ok = result.current.addTag('b')
		})

		expect(ok).toBe(true)

		expect(result.current.tags).toEqual(['a', 'b'])
	})

	it('addTag trims whitespace and rejects empty input', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: [] }))

		let ok = true

		act(() => {
			ok = result.current.addTag('   ')
		})

		expect(ok).toBe(false)

		expect(result.current.tags).toEqual([])
	})

	it('addTag rejects duplicates', () => {
		const { result } = renderHook(() => useTagInput({ defaultValue: ['a'] }))

		let ok = true

		act(() => {
			ok = result.current.addTag('a')
		})

		expect(ok).toBe(false)

		expect(result.current.tags).toEqual(['a'])
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

	it('fires onMaxReleased when removal pulls the list back below max', () => {
		const onMaxReleased = vi.fn()

		const { result } = renderHook(() =>
			useTagInput({ defaultValue: ['a', 'b'], max: 2, onMaxReleased }),
		)

		act(() => {
			result.current.removeTag(0)
		})

		expect(onMaxReleased).toHaveBeenCalledOnce()
	})
})
