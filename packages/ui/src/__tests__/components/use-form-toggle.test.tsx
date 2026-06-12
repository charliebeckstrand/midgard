import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form, useFormField, useFormToggle } from '../../components/form'
import { makeChangeEvent } from '../helpers'

function makeWrapper<T extends Record<string, unknown>>(defaultValues: T) {
	return ({ children }: { children: ReactNode }) => (
		<Form defaultValues={defaultValues}>{children}</Form>
	)
}

describe('useFormToggle', () => {
	it('passes checked and onChange through outside a Form', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() => useFormToggle({ checked: true, onChange }))

		expect(result.current.checked).toBe(true)

		expect(result.current.onChange).toBe(onChange)

		expect(result.current.invalid).toBeUndefined()
	})

	it('reads the form field and writes back through it when no checked prop', () => {
		const wrapper = makeWrapper({ agree: false })

		const { result } = renderHook(
			() => ({
				toggle: useFormToggle({ name: 'agree' }),
				field: useFormField('agree'),
			}),
			{ wrapper },
		)

		expect(result.current.toggle.checked).toBe(false)

		act(() => {
			result.current.toggle.onChange?.(
				makeChangeEvent<HTMLInputElement>({ target: { checked: true } as HTMLInputElement }),
			)
		})

		expect(result.current.toggle.checked).toBe(true)

		expect(result.current.field?.value).toBe(true)
	})

	it('lets an explicit checked prop win over the form field', () => {
		const onChange = vi.fn()

		const wrapper = makeWrapper({ agree: false })

		const { result } = renderHook(
			() => ({
				toggle: useFormToggle({ name: 'agree', checked: true, onChange }),
				field: useFormField('agree'),
			}),
			{ wrapper },
		)

		expect(result.current.toggle.checked).toBe(true)

		// The consumer's own handler resolves; changes do not reach the store.
		expect(result.current.toggle.onChange).toBe(onChange)

		act(() => {
			result.current.toggle.onChange?.(
				makeChangeEvent<HTMLInputElement>({ target: { checked: true } as HTMLInputElement }),
			)
		})

		expect(result.current.field?.value).toBe(false)

		// The field's error state still surfaces for useControlProps.
		expect(result.current.toggle.invalid).toBe(false)
	})

	it('chains the consumer onChange while bound', () => {
		const onChange = vi.fn()

		const wrapper = makeWrapper({ agree: false })

		const { result } = renderHook(() => useFormToggle({ name: 'agree', onChange }), { wrapper })

		act(() => {
			result.current.onChange?.(
				makeChangeEvent<HTMLInputElement>({ target: { checked: true } as HTMLInputElement }),
			)
		})

		expect(onChange).toHaveBeenCalled()
	})
})
