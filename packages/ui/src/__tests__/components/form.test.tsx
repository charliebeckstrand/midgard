import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent, FocusEvent, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Form,
	useFormActions,
	useFormContext,
	useFormField,
	useFormState,
	useFormStatus,
	useFormText,
	useFormToggle,
} from '../../components/form'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Form', () => {
	it('renders with data-slot="form"', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<input name="name" />
			</Form>,
		)

		const el = bySlot(container, 'form')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FORM')
	})

	it('renders children', () => {
		renderUI(
			<Form defaultValues={{ name: '' }}>
				<span>Inside the form</span>
			</Form>,
		)

		expect(screen.getByText('Inside the form')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} className="custom">
				<input name="name" />
			</Form>,
		)

		const el = bySlot(container, 'form')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} id="signup">
				<input name="name" />
			</Form>,
		)

		const el = bySlot(container, 'form')

		expect(el).toHaveAttribute('id', 'signup')
	})

	it('calls onSubmit with current values', () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		fireEvent.submit(form)

		expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }, expect.any(Object))
	})

	it('calls onReset when the form is reset', () => {
		const onReset = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onReset={onReset}>
				<button type="reset">Reset</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		fireEvent.reset(form)

		expect(onReset).toHaveBeenCalledOnce()
	})

	it('disables the inner fieldset when disabled is set', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} disabled>
				<input name="name" />
			</Form>,
		)

		const fieldset = container.querySelector('fieldset')

		expect(fieldset).toBeDisabled()
	})

	it('skips onSubmit and keeps errors when validation fails on submit', async () => {
		const onSubmit = vi.fn()

		function Consumer() {
			const status = useFormStatus()

			return <span data-testid="valid">{String(status?.isValid)}</span>
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onSubmit={onSubmit}
			>
				<Consumer />
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSubmit).not.toHaveBeenCalled()

		expect(screen.getByTestId('valid').textContent).toBe('false')
	})

	it('submits when validation passes', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onSubmit={onSubmit}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }, expect.any(Object))
	})

	it('resets values back to defaults on reset', () => {
		function Consumer() {
			const field = useFormField('name')

			return (
				<>
					<span data-testid="value">{String(field?.value)}</span>
					<button type="button" onClick={() => field?.setValue('Changed')}>
						Change
					</button>
				</>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Initial' }}>
				<Consumer />
			</Form>,
		)

		act(() => {
			screen.getByRole('button', { name: 'Change' }).click()
		})

		expect(screen.getByTestId('value').textContent).toBe('Changed')

		const form = bySlot(container, 'form') as HTMLFormElement

		act(() => {
			fireEvent.reset(form)
		})

		expect(screen.getByTestId('value').textContent).toBe('Initial')
	})

	it('runs validation on change when validateOn="change"', () => {
		const validator = vi.fn((value: unknown) => (value ? undefined : 'required'))

		function Consumer() {
			const field = useFormField('name')

			return (
				<button type="button" onClick={() => field?.setValue('')}>
					Clear
				</button>
			)
		}

		renderUI(
			<Form defaultValues={{ name: 'Ada' }} validate={{ name: validator }} validateOn="change">
				<Consumer />
			</Form>,
		)

		screen.getByRole('button', { name: 'Clear' }).click()

		expect(validator).toHaveBeenCalled()
	})

	it('exposes helpers to onSubmit and allows setting external errors', async () => {
		const onSubmit = vi.fn(
			(_values, helpers: { setErrors: (e: Record<string, string>) => void }) => {
				helpers.setErrors({ name: 'taken' })
			},
		)

		function Consumer() {
			const field = useFormField('name')

			return <span data-testid="error">{field?.error ?? ''}</span>
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<Consumer />
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(screen.getByTestId('error').textContent).toBe('taken')
	})

	it('disables the fieldset while onSubmit is pending', async () => {
		let resolveSubmit: (() => void) | undefined

		const onSubmit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveSubmit = resolve
				}),
		)

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		const fieldset = container.querySelector('fieldset')

		expect(fieldset).toBeDisabled()

		await act(async () => {
			resolveSubmit?.()
		})

		expect(fieldset).not.toBeDisabled()
	})
})

function makeWrapper<T extends Record<string, unknown>>(defaultValues: T) {
	return ({ children }: { children: ReactNode }) => (
		<Form defaultValues={defaultValues}>{children}</Form>
	)
}

describe('useFormContext', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormContext())

		expect(result.current).toBeUndefined()
	})

	it('returns combined state + actions inside a Form', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormContext(), { wrapper })

		expect(result.current?.values).toEqual({ name: 'Ada' })

		expect(typeof result.current?.setValue).toBe('function')

		expect(result.current?.isDirty).toBe(false)
	})
})

describe('useFormActions', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormActions())

		expect(result.current).toBeUndefined()
	})

	it('returns a stable actions object across re-renders', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result, rerender } = renderHook(() => useFormActions(), { wrapper })

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})

describe('useFormState', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormState())

		expect(result.current).toBeUndefined()
	})

	it('reflects current values', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormState(), { wrapper })

		expect(result.current?.values).toEqual({ name: 'Ada' })
	})
})

describe('useFormField', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormField('name'))

		expect(result.current).toBeUndefined()
	})

	it('returns undefined when name is missing', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormField(undefined), { wrapper })

		expect(result.current).toBeUndefined()
	})

	it('updates value via setValue and dirties the field', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormField('name'), { wrapper })

		expect(result.current?.value).toBe('Ada')

		expect(result.current?.dirty).toBe(false)

		act(() => {
			result.current?.setValue('Grace')
		})

		expect(result.current?.value).toBe('Grace')

		expect(result.current?.dirty).toBe(true)
	})

	it('marks the field as touched via setTouched', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormField('name'), { wrapper })

		expect(result.current?.touched).toBe(false)

		act(() => {
			result.current?.setTouched()
		})

		expect(result.current?.touched).toBe(true)
	})
})

describe('useFormText', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormText('name'))

		expect(result.current).toBeUndefined()
	})

	it('returns a binding that updates the form value and calls external onChange', () => {
		const onChange = vi.fn()

		const wrapper = makeWrapper({ name: '' })

		const { result } = renderHook(() => useFormText<HTMLInputElement>('name', { onChange }), {
			wrapper,
		})

		expect(result.current?.value).toBe('')

		act(() => {
			result.current?.onChange({
				target: { value: 'hello' },
			} as unknown as ChangeEvent<HTMLInputElement>)
		})

		expect(result.current?.value).toBe('hello')

		expect(onChange).toHaveBeenCalled()
	})

	it('marks the field as touched and calls external onBlur', () => {
		const onBlur = vi.fn()

		const wrapper = makeWrapper({ name: '' })

		const { result } = renderHook(() => useFormText<HTMLInputElement>('name', { onBlur }), {
			wrapper,
		})

		act(() => {
			result.current?.onBlur({} as FocusEvent<HTMLInputElement>)
		})

		expect(onBlur).toHaveBeenCalledOnce()
	})
})

describe('useFormToggle', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormToggle('agree'))

		expect(result.current).toBeUndefined()
	})

	it('toggles the field and calls external onChange', () => {
		const onChange = vi.fn()

		const wrapper = makeWrapper({ agree: false })

		const { result } = renderHook(() => useFormToggle('agree', { onChange }), { wrapper })

		expect(result.current?.checked).toBe(false)

		act(() => {
			result.current?.onChange({
				target: { checked: true },
			} as unknown as ChangeEvent<HTMLInputElement>)
		})

		expect(result.current?.checked).toBe(true)

		expect(onChange).toHaveBeenCalled()
	})
})

describe('useFormStatus', () => {
	it('returns undefined outside a Form', () => {
		const { result } = renderHook(() => useFormStatus())

		expect(result.current).toBeUndefined()
	})

	it('returns form-level status flags', () => {
		const wrapper = makeWrapper({ name: 'Ada' })

		const { result } = renderHook(() => useFormStatus(), { wrapper })

		expect(result.current).toEqual({ submitting: false, isDirty: false, isValid: true })
	})
})
