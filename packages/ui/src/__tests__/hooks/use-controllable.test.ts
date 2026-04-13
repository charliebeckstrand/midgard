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

	it('calls onChange when value is set in uncontrolled mode', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 'a', onChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onChange).toHaveBeenCalledWith('b')
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

		// Value stays controlled
		expect(result.current[0]).toBe('locked')
	})

	it('calls onChange in controlled mode', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 'a', onChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onChange).toHaveBeenCalledWith('b')
	})

	it('treats null value as controlled with undefined result', () => {
		const { result } = renderHook(() => useControllable({ value: null, defaultValue: 'fallback' }))

		expect(result.current[0]).toBeUndefined()
	})
})
