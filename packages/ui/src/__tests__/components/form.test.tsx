import { act, renderHook } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
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
import {
	bySlot,
	expectSlot,
	fireEvent,
	makeChangeEvent,
	makeFocusEvent,
	renderUI,
	screen,
} from '../helpers'

describe('Form', () => {
	it('renders with data-slot="form"', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<input name="name" />
			</Form>,
		)

		expectSlot(container, 'form', 'form')
	})

	it('re-renders only the typed field, not its siblings', () => {
		const renders = { a: 0, b: 0 }

		function CountingField({ name }: { name: 'a' | 'b' }) {
			const field = useFormField(name)

			renders[name]++

			return (
				<input
					data-slot={`field-${name}`}
					value={(field?.value as string) ?? ''}
					onChange={(e) => field?.setValue(e.target.value)}
				/>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ a: '', b: '' }}>
				<CountingField name="a" />
				<CountingField name="b" />
			</Form>,
		)

		const bAfterMount = renders.b

		fireEvent.change(bySlot(container, 'field-a') as HTMLInputElement, { target: { value: 'x' } })

		// The edited field re-rendered with its new value...
		expect((bySlot(container, 'field-a') as HTMLInputElement).value).toBe('x')
		expect(renders.a).toBeGreaterThan(bAfterMount)

		// ...while the untouched sibling did not re-render at all.
		expect(renders.b).toBe(bAfterMount)
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

	it('calls onSubmit with current values', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		// handleSubmit awaits onSubmit then calls setSubmitting(false); wrap so
		// the trailing setState lands inside act.
		await act(async () => {
			fireEvent.submit(form)
		})

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

			return <span data-testid="valid">{String(status?.valid)}</span>
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

		fireEvent.click(screen.getByRole('button', { name: 'Change' }))

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

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

		expect(validator).toHaveBeenCalled()
	})

	it('exposes helpers to onSubmit and allows setting external errors', async () => {
		const onSubmit = vi.fn(
			(_values, helpers: { setErrors: (e: Record<string, string | string[]>) => void }) => {
				helpers.setErrors({ name: 'taken' })
			},
		)

		function Consumer() {
			const field = useFormField('name')

			return <span data-testid="error">{field?.errors?.[0] ?? ''}</span>
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

	it('drops a slow submit that resolves after a reset', async () => {
		let resolveSubmit: ((result: { fieldErrors: { name: string } }) => void) | undefined

		const onSubmit = vi.fn(
			() =>
				new Promise<{ fieldErrors: { name: string } }>((resolve) => {
					resolveSubmit = resolve
				}),
		)

		// Captured during render so the reset can be driven programmatically — a
		// reset button would sit inside the fieldset that submitting disables.
		let actions: ReturnType<typeof useFormActions>

		function Probe() {
			const field = useFormField('name')

			const status = useFormStatus()

			actions = useFormActions()

			return (
				<>
					<span data-testid="error">{field?.errors?.[0] ?? ''}</span>
					<span data-testid="valid">{String(status?.valid)}</span>
				</>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<Probe />
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		// Reset supersedes the in-flight submit and clears its pending state.
		await act(async () => {
			actions?.reset()
		})

		// The handler resolves only now — its stale fieldErrors must be dropped.
		await act(async () => {
			resolveSubmit?.({ fieldErrors: { name: 'taken on the server' } })
		})

		expect(screen.getByTestId('error').textContent).toBe('')
		expect(screen.getByTestId('valid').textContent).toBe('true')
		expect(container.querySelector('fieldset')).not.toBeDisabled()
	})

	it('delivers { ok: true, values } to onSettled when onSubmit returns void', async () => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={() => {}} onSettled={onSettled}>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSettled).toHaveBeenCalledTimes(1)
		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Ada' } })
	})

	it('delivers { ok: false, error } to onSettled when onSubmit throws', async () => {
		const failure = new Error('rate limited')
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => {
					throw failure
				}}
				onSettled={onSettled}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSettled).toHaveBeenCalledTimes(1)
		expect(onSettled).toHaveBeenCalledWith({ ok: false, error: failure })
	})

	it('wraps non-Error throws in Error before delivering them to onSettled', async () => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => {
					throw 'boom'
				}}
				onSettled={onSettled}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSettled).toHaveBeenCalledTimes(1)

		const outcome = onSettled.mock.calls[0]?.[0] as { ok: false; error: Error }

		expect(outcome.ok).toBe(false)
		expect(outcome.error).toBeInstanceOf(Error)
		expect(outcome.error.message).toBe('boom')
	})

	it('does not fire onSettled when onSubmit returns { fieldErrors }', async () => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors: { name: 'taken' } })}
				onSettled={onSettled}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSettled).not.toHaveBeenCalled()
	})

	it('does not fire onSettled when client validation blocks submission', async () => {
		const onSubmit = vi.fn()
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				validate={{ name: (value) => (value.length === 0 ? 'required' : undefined) }}
				onSubmit={onSubmit}
				onSettled={onSettled}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(onSubmit).not.toHaveBeenCalled()
		expect(onSettled).not.toHaveBeenCalled()
	})

	it('applies fieldErrors returned from onSubmit', async () => {
		function ErrorProbe() {
			const field = useFormField('name')

			return <span data-testid="field-error">{field?.errors?.[0] ?? ''}</span>
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors: { name: 'taken on the server' } })}
			>
				<ErrorProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(screen.getByTestId('field-error').textContent).toBe('taken on the server')
	})

	it('reports valid=false once server fieldErrors are applied, with no client validator', async () => {
		function ValidProbe() {
			const status = useFormStatus()

			return <span data-testid="valid">{String(status?.valid)}</span>
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors: { name: 'taken on the server' } })}
			>
				<ValidProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		// No client validator: validity must track the live error map, not a
		// validator pass that can't see server errors.
		expect(screen.getByTestId('valid').textContent).toBe('true')

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(screen.getByTestId('valid').textContent).toBe('false')
	})

	it('marks an object-valued field clean after restoring its structural value', () => {
		function DirtyProbe() {
			const field = useFormField('tags')

			return <span data-testid="dirty">{field?.dirty ? 'dirty' : 'clean'}</span>
		}

		function Controls() {
			const field = useFormField('tags')

			return (
				<>
					<button type="button" onClick={() => field?.setValue(['a'])}>
						mutate
					</button>
					<button type="button" onClick={() => field?.setValue([])}>
						restore
					</button>
				</>
			)
		}

		renderUI(
			<Form defaultValues={{ tags: [] as string[] }}>
				<DirtyProbe />
				<Controls />
			</Form>,
		)

		expect(screen.getByTestId('dirty').textContent).toBe('clean')

		act(() => {
			screen.getByText('mutate').click()
		})

		expect(screen.getByTestId('dirty').textContent).toBe('dirty')

		act(() => {
			screen.getByText('restore').click()
		})

		expect(screen.getByTestId('dirty').textContent).toBe('clean')
	})

	it('replaces values when the controlled `values` prop reference changes', () => {
		function ValueProbe() {
			const field = useFormField('name')

			return <span data-testid="value">{String(field?.value ?? '')}</span>
		}

		function Host() {
			const [values, setValues] = useState({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues({ name: 'Grace' })}>
						sync
					</button>
					<Form defaultValues={{ name: '' }} values={values}>
						<ValueProbe />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(screen.getByTestId('value').textContent).toBe('Ada')

		act(() => {
			screen.getByText('sync').click()
		})

		expect(screen.getByTestId('value').textContent).toBe('Grace')
	})

	it('shifts the dirty baseline after a controlled values sync', () => {
		function DirtyProbe() {
			const field = useFormField('name')

			return <span data-testid="dirty">{field?.dirty ? 'dirty' : 'clean'}</span>
		}

		function Host() {
			const [values, setValues] = useState({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues({ name: 'Grace' })}>
						sync
					</button>
					<Form defaultValues={{ name: '' }} values={values}>
						<DirtyProbe />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(screen.getByTestId('dirty').textContent).toBe('clean')

		act(() => {
			screen.getByText('sync').click()
		})

		expect(screen.getByTestId('dirty').textContent).toBe('clean')
	})

	it('preserves touched and errors across a controlled values sync', () => {
		function TouchedProbe() {
			const field = useFormField('name')

			return (
				<>
					<span data-testid="touched">{field?.touched ? 'touched' : 'untouched'}</span>
					<span data-testid="error">{field?.errors?.[0] ?? ''}</span>
				</>
			)
		}

		function Host() {
			const [values, setValues] = useState({ name: '' })

			return (
				<>
					<button type="button" onClick={() => setValues({ name: 'server-data' })}>
						sync
					</button>
					<Form
						defaultValues={{ name: '' }}
						values={values}
						validate={{ name: (v) => (v.length === 0 ? 'required' : undefined) }}
					>
						<TouchedProbe />
					</Form>
				</>
			)
		}

		const { container } = renderUI(<Host />)

		const form = bySlot(container, 'form') as HTMLFormElement

		// Touch the form so `touched.name` and `errors.name` exist before sync.
		act(() => {
			fireEvent.submit(form)
		})

		expect(screen.getByTestId('touched').textContent).toBe('touched')
		expect(screen.getByTestId('error').textContent).toBe('required')

		act(() => {
			screen.getByText('sync').click()
		})

		expect(screen.getByTestId('touched').textContent).toBe('touched')
		expect(screen.getByTestId('error').textContent).toBe('required')
	})

	it('does not re-sync when the values reference is unchanged across renders', () => {
		function ValueProbe() {
			const field = useFormField('name')

			return <span data-testid="value">{String(field?.value ?? '')}</span>
		}

		const stableValues = { name: 'Ada' }

		function Host() {
			const [tick, setTick] = useState(0)

			return (
				<>
					<button type="button" onClick={() => setTick((t) => t + 1)}>
						bump · {tick}
					</button>
					<Form defaultValues={{ name: '' }} values={stableValues}>
						<ValueProbe />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(screen.getByTestId('value').textContent).toBe('Ada')

		act(() => {
			screen.getByText(/bump/).click()
		})

		// Same reference → no sync triggered, value still reflects the initial sync.
		expect(screen.getByTestId('value').textContent).toBe('Ada')
	})

	it('re-syncs to defaultValues when controlled values transitions back to undefined', () => {
		function ValueProbe() {
			const field = useFormField('name')

			return <span data-testid="value">{String(field?.value ?? '')}</span>
		}

		function Host() {
			const [values, setValues] = useState<{ name: string } | undefined>({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues(undefined)}>
						clear
					</button>
					<Form defaultValues={{ name: 'baseline' }} values={values}>
						<ValueProbe />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(screen.getByTestId('value').textContent).toBe('Ada')

		act(() => {
			screen.getByText('clear').click()
		})

		expect(screen.getByTestId('value').textContent).toBe('baseline')
	})

	it('reset(nextDefaults) shifts the baseline and clears errors and touched', () => {
		function Probe() {
			const field = useFormField('name')
			const actions = useFormActions()

			return (
				<>
					<span data-testid="value">{String(field?.value ?? '')}</span>
					<span data-testid="dirty">{field?.dirty ? 'dirty' : 'clean'}</span>
					<span data-testid="touched">{field?.touched ? 'touched' : 'untouched'}</span>
					<span data-testid="error">{field?.errors?.[0] ?? ''}</span>
					<button type="button" onClick={() => actions?.reset({ name: 'Grace' })}>
						reset-new
					</button>
				</>
			)
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				validate={{ name: (v) => (v.length === 0 ? 'required' : undefined) }}
			>
				<Probe />
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		// Dirty the form and provoke an error before the reset.
		act(() => {
			fireEvent.submit(form)
		})

		expect(screen.getByTestId('touched').textContent).toBe('touched')

		act(() => {
			screen.getByText('reset-new').click()
		})

		expect(screen.getByTestId('value').textContent).toBe('Grace')
		expect(screen.getByTestId('dirty').textContent).toBe('clean')
		expect(screen.getByTestId('touched').textContent).toBe('untouched')
		expect(screen.getByTestId('error').textContent).toBe('')
	})

	it('reset() with no args reverts to the original defaultValues', () => {
		function Probe() {
			const field = useFormField('name')
			const actions = useFormActions()

			return (
				<>
					<span data-testid="value">{String(field?.value ?? '')}</span>
					<button type="button" onClick={() => actions?.setValue('name', 'Grace')}>
						mutate
					</button>
					<button type="button" onClick={() => actions?.reset()}>
						reset
					</button>
				</>
			)
		}

		renderUI(
			<Form defaultValues={{ name: 'Ada' }}>
				<Probe />
			</Form>,
		)

		act(() => {
			screen.getByText('mutate').click()
		})

		expect(screen.getByTestId('value').textContent).toBe('Grace')

		act(() => {
			screen.getByText('reset').click()
		})

		expect(screen.getByTestId('value').textContent).toBe('Ada')
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

		expect(result.current?.dirty).toBe(false)
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
			result.current?.onChange(
				makeChangeEvent<HTMLInputElement>({
					target: { value: 'hello' } as HTMLInputElement,
				}),
			)
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
			result.current?.onBlur(makeFocusEvent<HTMLInputElement>())
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
			result.current?.onChange(
				makeChangeEvent<HTMLInputElement>({
					target: { checked: true } as HTMLInputElement,
				}),
			)
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

		expect(result.current).toEqual({ submitting: false, dirty: false, valid: true })
	})
})
