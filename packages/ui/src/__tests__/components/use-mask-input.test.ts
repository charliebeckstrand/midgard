import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form, useFormField } from '../../components/form'
import { useMaskInput } from '../../components/mask-input/use-mask-input'
import { makeChangeEvent } from '../helpers'

const upper = (raw: string) => raw.toUpperCase()

describe('useMaskInput', () => {
	it('formats the defaultValue at initialisation', () => {
		const { result } = renderHook(() => useMaskInput({ defaultValue: 'abc', format: upper }))

		expect(result.current.value).toBe('ABC')
	})

	it('returns an empty string when no value or defaultValue is provided', () => {
		const { result } = renderHook(() => useMaskInput({ format: upper }))

		expect(result.current.value).toBe('')
	})

	it('formats raw input when setValue is called', () => {
		const { result } = renderHook(() => useMaskInput({ defaultValue: '', format: upper }))

		act(() => {
			result.current.setValue('xyz')
		})

		expect(result.current.value).toBe('XYZ')
	})

	it('formats the event target value when onChange is called', () => {
		const { result } = renderHook(() => useMaskInput({ defaultValue: '', format: upper }))

		act(() => {
			result.current.onChange(makeChangeEvent({ target: { value: 'foo' } as HTMLInputElement }))
		})

		expect(result.current.value).toBe('FOO')
	})

	it('calls the onChange option with the formatted value in uncontrolled mode', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() => useMaskInput({ defaultValue: '', onChange, format: upper }))

		act(() => {
			result.current.setValue('abc')
		})

		expect(onChange).toHaveBeenCalledWith('ABC')
	})

	it('uses the controlled value prop when provided', () => {
		const { result } = renderHook(() =>
			useMaskInput({ value: 'locked', defaultValue: 'fallback', format: upper }),
		)

		expect(result.current.value).toBe('locked')
	})

	it('returns no invalid flag outside a Form', () => {
		const { result } = renderHook(() => useMaskInput({ format: upper }))

		expect(result.current.invalid).toBeUndefined()
	})

	it('marks the bound form field touched via onBlur', () => {
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(Form<{ code: string }>, { defaultValues: { code: '' }, children })

		const { result } = renderHook(
			() => ({
				masked: useMaskInput({ name: 'code', format: upper }),
				field: useFormField('code'),
			}),
			{ wrapper },
		)

		expect(result.current.field?.touched).toBe(false)

		act(() => {
			result.current.masked.onBlur()
		})

		expect(result.current.field?.touched).toBe(true)
	})

	it('surfaces the bound field error state through invalid', () => {
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(Form<{ code: string }>, {
				defaultValues: { code: '' },
				validate: { code: (v) => (v.length < 3 ? 'too short' : undefined) },
				validateOn: 'change',
				children,
			})

		const { result } = renderHook(() => useMaskInput({ name: 'code', format: upper }), { wrapper })

		expect(result.current.invalid).toBe(false)

		act(() => {
			result.current.setValue('ab')
		})

		expect(result.current.invalid).toBe(true)
	})
})
