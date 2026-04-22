import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useMaskedInput } from '../../hooks/use-masked-input'

const upper = (raw: string) => raw.toUpperCase()

describe('useMaskedInput', () => {
	it('formats the defaultValue at initialisation', () => {
		const { result } = renderHook(() => useMaskedInput({ defaultValue: 'abc', format: upper }))

		expect(result.current.value).toBe('ABC')
	})

	it('returns an empty string when no value or defaultValue is provided', () => {
		const { result } = renderHook(() => useMaskedInput({ format: upper }))

		expect(result.current.value).toBe('')
	})

	it('formats raw input when setValue is called', () => {
		const { result } = renderHook(() => useMaskedInput({ defaultValue: '', format: upper }))

		act(() => {
			result.current.setValue('xyz')
		})

		expect(result.current.value).toBe('XYZ')
	})

	it('formats the event target value when onChange is called', () => {
		const { result } = renderHook(() => useMaskedInput({ defaultValue: '', format: upper }))

		act(() => {
			result.current.onChange({ target: { value: 'foo' } } as ChangeEvent<HTMLInputElement>)
		})

		expect(result.current.value).toBe('FOO')
	})

	it('calls the onChange option with the formatted value in uncontrolled mode', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() =>
			useMaskedInput({ defaultValue: '', onChange, format: upper }),
		)

		act(() => {
			result.current.setValue('abc')
		})

		expect(onChange).toHaveBeenCalledWith('ABC')
	})

	it('uses the controlled value prop when provided', () => {
		const { result } = renderHook(() =>
			useMaskedInput({ value: 'locked', defaultValue: 'fallback', format: upper }),
		)

		expect(result.current.value).toBe('locked')
	})
})
