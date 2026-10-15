import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useFormField, useFormValue } from '../../components/form'
import { makeFormWrapper } from '../helpers/form-wrapper'

/** A control whose input mounts only after a press, as a dead Rating row does. */
function LateInput({ onReset }: { onReset: () => void }) {
	const [shown, setShown] = useState(false)

	const { value, resetRef, setValue } = useFormValue<string>(undefined, {
		defaultValue: 'seed',
		onReset,
	})

	return (
		<>
			<button type="button" onClick={() => setShown(true)}>
				Show
			</button>
			{shown && (
				<input
					ref={resetRef}
					aria-label="Late"
					value={value ?? ''}
					onChange={(event) => setValue(event.target.value)}
				/>
			)}
			<button type="reset">Reset form</button>
		</>
	)
}

describe('useFormValue', () => {
	it('acts as plain controllable state outside a Form', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useFormValue<number>('amount', { defaultValue: 1, onValueChange }),
		)

		expect(result.current.value).toBe(1)

		expect(result.current.invalid).toBeUndefined()

		act(() => {
			result.current.setValue(2)
		})

		expect(result.current.value).toBe(2)

		expect(onValueChange).toHaveBeenCalledWith(2)
	})

	it('reads the form field value and writes back through it', () => {
		const wrapper = makeFormWrapper({ defaultValues: { amount: 5 } })

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
		const wrapper = makeFormWrapper({ defaultValues: { amount: undefined } })

		const { result } = renderHook(() => useFormValue<number>('amount', { defaultValue: 9 }), {
			wrapper,
		})

		expect(result.current.value).toBeUndefined()
	})

	it('lets an explicit value prop win over the form field', () => {
		const wrapper = makeFormWrapper({ defaultValues: { amount: 5 } })

		const { result } = renderHook(() => useFormValue<number>('amount', { value: 3 }), { wrapper })

		expect(result.current.value).toBe(3)
	})

	it('marks the field touched via setTouched', () => {
		const wrapper = makeFormWrapper({ defaultValues: { amount: 5 } })

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

		const wrapper = makeFormWrapper({ defaultValues: { amount: 5 } })

		const { result } = renderHook(() => useFormValue<number>('amount', { onValueChange }), {
			wrapper,
		})

		act(() => {
			result.current.setValue(6)
		})

		expect(onValueChange).toHaveBeenCalledWith(6)
	})

	it('sets the value back to defaultValue on a native reset of an input that mounts late', async () => {
		const onReset = vi.fn()

		render(
			<form>
				<LateInput onReset={onReset} />
			</form>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Show' }))

		const input = screen.getByLabelText('Late') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'edited' } })

		fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(input.value).toBe('seed')

		expect(onReset).toHaveBeenCalledOnce()
	})
})
