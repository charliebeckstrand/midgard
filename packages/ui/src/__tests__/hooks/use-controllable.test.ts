import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useControllable } from '../../hooks/use-controllable'

describe('useControllable', () => {
	it('uses defaultValue for initial uncontrolled state', () => {
		const { result } = renderHook(() => useControllable({ defaultValue: 'hello' }))

		expect(result.current[0]).toBe('hello')
	})

	it('returns undefined when no defaultValue is provided', () => {
		const { result } = renderHook(() => useControllable({}))

		expect(result.current[0]).toBeUndefined()
	})

	it('updates internal state in uncontrolled mode', () => {
		const { result } = renderHook(() => useControllable({ defaultValue: 0 }))

		act(() => {
			result.current[1](42)
		})

		expect(result.current[0]).toBe(42)
	})

	it('calls onValueChange when value is set in uncontrolled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 'a', onValueChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('uses the provided value in controlled mode', () => {
		const { result } = renderHook(() => useControllable({ value: 'controlled' }))

		expect(result.current[0]).toBe('controlled')
	})

	it('does not update internal state in controlled mode', () => {
		const { result } = renderHook(() => useControllable({ value: 'locked' }))

		act(() => {
			result.current[1]('new-value')
		})

		expect(result.current[0]).toBe('locked')
	})

	it('calls onValueChange in controlled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 'a', onValueChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('treats null value as controlled with undefined result', () => {
		const { result } = renderHook(() => useControllable({ value: null, defaultValue: 'fallback' }))

		expect(result.current[0]).toBeUndefined()
	})

	it('keeps internal state current when a controlled value clears to undefined', () => {
		const { result, rerender } = renderHook(
			({ value }: { value: string | undefined }) => useControllable({ value }),
			{ initialProps: { value: undefined as string | undefined } },
		)

		// Select while uncontrolled; the parent echoes the value back as controlled.
		act(() => {
			result.current[1]('a')
		})

		rerender({ value: 'a' })

		// Deselect: the setter resolves undefined and the parent clears its state,
		// flipping the hook back to uncontrolled. The stale internal value must
		// not resurface.
		act(() => {
			result.current[1](undefined)
		})

		rerender({ value: undefined })

		expect(result.current[0]).toBeUndefined()
	})

	it('chains functional updates batched in a single act', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 0, onValueChange }))

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1)
			result.current[1]((prev) => (prev ?? 0) + 1)
		})

		expect(result.current[0]).toBe(2)

		expect(onValueChange).toHaveBeenNthCalledWith(1, 1)

		expect(onValueChange).toHaveBeenNthCalledWith(2, 2)
	})

	it('chains batched functional updates in controlled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 10, onValueChange }))

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1)
			result.current[1]((prev) => (prev ?? 0) + 1)
		})

		expect(onValueChange).toHaveBeenNthCalledWith(1, 11)

		expect(onValueChange).toHaveBeenNthCalledWith(2, 12)
	})
})
