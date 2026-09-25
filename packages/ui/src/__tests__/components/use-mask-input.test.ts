import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFormField } from '../../components/form'
import { useMaskInput } from '../../components/mask-input/use-mask-input'
import { makeChangeEvent } from '../helpers'
import { makeFormWrapper } from '../helpers/form-wrapper'

const upper = (raw: string) => raw.toUpperCase()

describe('useMaskInput', () => {
	it('formats the defaultValue at initialization', () => {
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

	it('formats the controlled value prop when provided', () => {
		const { result } = renderHook(() =>
			useMaskInput({ value: 'locked', defaultValue: 'fallback', format: upper }),
		)

		expect(result.current.value).toBe('LOCKED')
	})

	it('formats a new controlled value on each render', () => {
		const { result, rerender } = renderHook(
			({ value }: { value: string | null }) => useMaskInput({ value, format: upper }),
			{ initialProps: { value: 'abc' as string | null } },
		)

		expect(result.current.value).toBe('ABC')

		rerender({ value: 'def' })

		expect(result.current.value).toBe('DEF')

		rerender({ value: null })

		expect(result.current.value).toBe('')
	})

	it('reads the bound field value without a format', () => {
		// The Form stores and submits this text, so the display must match it.
		const wrapper = makeFormWrapper({ defaultValues: { code: 'abc' } })

		const { result } = renderHook(() => useMaskInput({ name: 'code', format: upper }), { wrapper })

		expect(result.current.value).toBe('abc')
	})

	it('returns no invalid flag outside a Form', () => {
		const { result } = renderHook(() => useMaskInput({ format: upper }))

		expect(result.current.invalid).toBeUndefined()
	})

	it('marks the bound form field touched via onBlur', () => {
		const wrapper = makeFormWrapper({ defaultValues: { code: '' } })

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
		const wrapper = makeFormWrapper({
			defaultValues: { code: '' },
			validate: { code: (v) => (v.length < 3 ? 'too short' : undefined) },
			validateOn: 'change',
		})

		const { result } = renderHook(() => useMaskInput({ name: 'code', format: upper }), { wrapper })

		expect(result.current.invalid).toBe(false)

		act(() => {
			result.current.setValue('ab')
		})

		expect(result.current.invalid).toBe(true)
	})
})
