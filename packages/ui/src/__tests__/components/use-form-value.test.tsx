import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form, useFormField, useFormValue } from '../../components/form'

function makeWrapper<T extends Record<string, unknown>>(defaultValues: T) {
	return ({ children }: { children: ReactNode }) => (
		<Form defaultValues={defaultValues}>{children}</Form>
	)
}

describe('useFormValue', () => {
	it('acts as plain controllable state outside a Form', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useFormValue<number>('amount', { defaultValue: 1, onValueChange }),
		)

		expect(result.current.value).toBe(1)

		expect(result.current.binding).toBeUndefined()

		act(() => {
			result.current.setValue(2)
		})

		expect(result.current.value).toBe(2)

		expect(onValueChange).toHaveBeenCalledWith(2)
	})

	it('reads the form field value and writes back through it', () => {
		const wrapper = makeWrapper({ amount: 5 })

		const { result } = renderHook(
			() => ({
				bound: useFormValue<number>('amount', {}),
				field: useFormField('amount'),
			}),
			{ wrapper },
		)

		expect(result.current.bound.value).toBe(5)

		act(() => {
			result.current.bound.setValue(7)
		})

		expect(result.current.bound.value).toBe(7)

		expect(result.current.field?.value).toBe(7)
	})

	it('ignores defaultValue when form-bound', () => {
		const wrapper = makeWrapper({ amount: undefined })

		const { result } = renderHook(() => useFormValue<number>('amount', { defaultValue: 9 }), {
			wrapper,
		})

		expect(result.current.value).toBeUndefined()
	})

	it('lets an explicit value prop win over the form field', () => {
		const wrapper = makeWrapper({ amount: 5 })

		const { result } = renderHook(() => useFormValue<number>('amount', { value: 3 }), { wrapper })

		expect(result.current.value).toBe(3)
	})

	it('marks the field touched via setTouched', () => {
		const wrapper = makeWrapper({ amount: 5 })

		const { result } = renderHook(
			() => ({
				bound: useFormValue<number>('amount', {}),
				field: useFormField('amount'),
			}),
			{ wrapper },
		)

		expect(result.current.field?.touched).toBe(false)

		act(() => {
			result.current.bound.setTouched()
		})

		expect(result.current.field?.touched).toBe(true)
	})

	it('still notifies onValueChange while form-bound', () => {
		const onValueChange = vi.fn()

		const wrapper = makeWrapper({ amount: 5 })

		const { result } = renderHook(() => useFormValue<number>('amount', { onValueChange }), {
			wrapper,
		})

		act(() => {
			result.current.setValue(6)
		})

		expect(onValueChange).toHaveBeenCalledWith(6)
	})
})
