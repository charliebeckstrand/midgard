import { act, renderHook } from '@testing-library/react'
import { type ReactNode, type SyntheticEvent, useLayoutEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { CommandPalette } from '../../components/command-palette'
import { Confirm } from '../../components/confirm'
import { CopyButton } from '../../components/copy-button'
import { Dialog, DialogPanel } from '../../components/dialog'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { useInputValue } from '../../components/input/use-input-value'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Sheet, SheetPanel } from '../../components/sheet'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import {
	Form,
	FormFilters,
	FormFiltersField,
	type FormHelpers,
	FormSubmit,
	type SubmitOutcome,
	useFormActions,
	useFormContext,
	useFormField,
	useFormStatus,
	useFormValue,
} from '../../modules/form'
import { useFormReducer } from '../../modules/form/use-form-reducer'
import { useFormState } from '../../primitives/form/context'
import {
	bySlot,
	deferred,
	expectAnnouncement,
	fireEvent,
	getSlot,
	makeChangeEvent,
	makeFocusEvent,
	renderUI,
	screen,
	setupUser,
	within,
} from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'
import { makeFormWrapper } from '../helpers/form-wrapper'

/** Renders the form-level `valid` flag, which no field probe can show. */
function ValidProbe() {
	const status = useFormStatus()

	return <span data-testid="valid">{String(status?.valid)}</span>
}

/** Renders the form-level `submitting` flag. */
function SubmittingProbe() {
	const status = useFormStatus()

	return <span data-testid="submitting">{String(status?.submitting)}</span>
}

/** The `submitting` flag that {@link SubmittingProbe} shows. */
function submittingFlag(): string | null {
	return screen.getByTestId('submitting').textContent
}

/**
 * Submits the form in `container` inside an async `act`. The submit handler awaits
 * `onSubmit` and then sets state, and the async `act` holds that update.
 */
async function submit(container: HTMLElement) {
	await act(async () => {
		fireEvent.submit(getSlot<HTMLFormElement>(container, 'form'))
	})
}

/** The values of the one-field forms below. */
type Values = { name: string }

/** A submit event for a handler of {@link useFormReducer} called directly. */
function submitEvent(): SyntheticEvent<HTMLFormElement> {
	return { preventDefault: vi.fn() } as unknown as SyntheticEvent<HTMLFormElement>
}

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

	it('re-renders only the typed field, not its siblings', () => {
		const renders = { a: 0, b: 0 }

		function CountingField({ name }: { name: 'a' | 'b' }) {
			const field = useFormField(name)

			renders[name]++

			return (
				<input
					data-slot={`field-${name}`}
					value={(field?.value as string) ?? ''}
					onChange={(event) => field?.setValue(event.target.value)}
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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'field-a'), { target: { value: 'x' } })

		// The edited field re-renders with its new value.
		expect(getSlot<HTMLInputElement>(container, 'field-a').value).toBe('x')

		expect(renders.a).toBeGreaterThan(bAfterMount)

		// The untouched sibling does not re-render.
		expect(renders.b).toBe(bAfterMount)
	})

	it('calls onReset when the form is reset', () => {
		const onReset = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onReset={onReset}>
				<button type="reset">Reset</button>
			</Form>,
		)

		const form = getSlot<HTMLFormElement>(container, 'form')

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

	it('exposes no unnamed group for the inner fieldset', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<input name="name" aria-label="Name" />
			</Form>,
		)

		// The inner fieldset only cascades `disabled`, and it has no legend.
		expect(container.querySelector('fieldset')).toHaveAttribute('role', 'none')

		expect(within(container).queryByRole('group')).toBeNull()
	})

	it('skips onSubmit and keeps errors when validation fails on submit', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onSubmit={onSubmit}
			>
				<ValidProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

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

		await submit(container)

		expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }, expect.any(Object))
	})

	it('resets values back to defaults on reset', () => {
		function Consumer() {
			const field = useFormField('name')

			return (
				<button type="button" onClick={() => field?.setValue('Changed')}>
					Change
				</button>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Initial' }}>
				<Consumer />
				<FieldProbe name="name" />
			</Form>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Change' }))

		expect(getFieldProbe('name').textContent).toBe('Changed')

		const form = getSlot<HTMLFormElement>(container, 'form')

		act(() => {
			fireEvent.reset(form)
		})

		expect(getFieldProbe('name').textContent).toBe('Initial')
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

	it('does not mark an untouched field invalid when another field changes with validateOn="change"', () => {
		const required = (value: unknown) => (value ? undefined : 'required')

		const { container } = renderUI(
			<Form
				defaultValues={{ a: '', b: '' }}
				validate={{ a: required, b: required }}
				validateOn="change"
			>
				<Input name="a" />
				<Input name="b" />
			</Form>,
		)

		const [a, b] = container.querySelectorAll('input')

		fireEvent.change(a as HTMLInputElement, { target: { value: 'x' } })

		expect(a).not.toHaveAttribute('aria-invalid')

		expect(b).not.toHaveAttribute('aria-invalid')
	})

	it('exposes helpers to onSubmit and allows setting external errors', async () => {
		const onSubmit = vi.fn(
			(_values, helpers: { setErrors: (errors: Record<string, string | string[]>) => void }) => {
				helpers.setErrors({ name: 'taken' })
			},
		)

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<FieldProbe name="name" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(getFieldProbe('name')).toHaveAttribute('data-error', 'taken')
	})

	it('locks the fields, and disables nothing, while onSubmit is pending', async () => {
		const pending = deferred()

		const onSubmit = vi.fn(() => pending.promise)

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada', bare: '', terms: false }} onSubmit={onSubmit}>
				<Field>
					<Label>Name</Label>
					<Input name="name" />
				</Field>
				<Input name="bare" aria-label="Bare" />
				<CheckboxField>
					<Checkbox name="terms" />
					<Label>Terms</Label>
				</CheckboxField>
				<FieldProbe name="terms" />
				<Button type="button">Preview</Button>
				<button type="submit">Submit</button>
			</Form>,
		)

		const name = screen.getByRole('textbox', { name: 'Name' })

		const bare = screen.getByRole('textbox', { name: 'Bare' })

		const terms = screen.getByRole('checkbox', { name: 'Terms' })

		await submit(container)

		// The control: the submit is in flight.
		expect(onSubmit).toHaveBeenCalledOnce()

		// The fieldset follows only the `disabled` prop.
		expect(container.querySelector('fieldset')).not.toBeDisabled()

		for (const field of [name, bare, terms]) expect(field).toBeEnabled()

		expect(name).toHaveAttribute('readonly')

		expect(bare).toHaveAttribute('readonly')

		// A locked field refuses the write of its control.
		fireEvent.change(name, { target: { value: 'Grace' } })

		fireEvent.click(terms)

		expect(name).toHaveValue('Ada')

		expect(getFieldProbe('terms').textContent).toBe('false')

		// The Control scope is locked, so a Button is inert, and stays enabled.
		const preview = screen.getByRole('button', { name: 'Preview' })

		expect(preview).toBeEnabled()

		expect(preview).toHaveAttribute('aria-disabled', 'true')

		expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()

		await act(async () => {
			pending.resolve()
		})

		expect(name).not.toHaveAttribute('readonly')

		expect(preview).not.toHaveAttribute('aria-disabled')

		// The control: the same writes land once the submit ends.
		fireEvent.change(name, { target: { value: 'Grace' } })

		fireEvent.click(terms)

		expect(name).toHaveValue('Grace')

		expect(getFieldProbe('terms').textContent).toBe('true')
	})

	it('refuses a useFormValue write while a submit runs, and reports no change', async () => {
		const pending = deferred()

		const onValueChange = vi.fn()

		function Setter() {
			const { setValue } = useFormValue<string>('name', { onValueChange })

			return (
				<button type="button" onClick={() => setValue('Grace')}>
					Set
				</button>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={() => pending.promise}>
				<Setter />
				<FieldProbe name="name" />
			</Form>,
		)

		await submit(container)

		fireEvent.click(screen.getByRole('button', { name: 'Set' }))

		expect(getFieldProbe('name').textContent).toBe('Ada')

		expect(onValueChange).not.toHaveBeenCalled()

		await act(async () => {
			pending.resolve()
		})

		// The control: the same write lands once the submit ends.
		fireEvent.click(screen.getByRole('button', { name: 'Set' }))

		expect(getFieldProbe('name').textContent).toBe('Grace')

		expect(onValueChange).toHaveBeenCalledWith('Grace')
	})

	it('announces a running submit politely', async () => {
		const pending = deferred()

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={() => pending.promise}>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		await expectAnnouncement('Submitting')

		await act(async () => {
			pending.resolve()
		})
	})

	it('ignores a submit while one is in flight', async () => {
		const pending = deferred()

		const onSubmit = vi.fn(() => pending.promise)

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		await submit(container)

		expect(onSubmit).toHaveBeenCalledOnce()

		await act(async () => {
			pending.resolve()
		})

		await submit(container)

		expect(onSubmit).toHaveBeenCalledTimes(2)
	})

	it('leaves the fields of a filter bar inside the form enabled while it submits', async () => {
		const pending = deferred()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<FormFilters aria-label="Filters" defaultValue={{ search: undefined }}>
					<FormFiltersField name="search">
						<Label>Search</Label>
						<Input />
					</FormFiltersField>
					<Button type="button">Clear</Button>
				</FormFilters>
				<SubmittingProbe />
			</Form>,
		)

		await submit(container)

		// The control: the submit is in flight.
		expect(submittingFlag()).toBe('true')

		const search = screen.getByRole('textbox', { name: 'Search' })

		expect(search).toBeEnabled()

		expect(search).not.toHaveAttribute('readonly')

		expect(screen.getByRole('button', { name: 'Clear' })).not.toHaveAttribute('aria-disabled')

		await act(async () => {
			pending.resolve()
		})
	})

	it('leaves a library button that writes no field live while a submit runs', async () => {
		const pending = deferred()

		const onValueChange = vi.fn()

		const onPressedChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<Tabs value="a" onValueChange={onValueChange}>
					<TabList aria-label="Sections">
						<Tab value="a">Profile</Tab>
						<Tab value="b">Billing</Tab>
					</TabList>
				</Tabs>
				<CopyButton text="token" aria-label="Copy token" />
				<ToggleIconButton icon={<svg />} aria-label="Pin" onPressedChange={onPressedChange} />
				<Button type="button">Preview</Button>
				<SubmittingProbe />
			</Form>,
		)

		await submit(container)

		// The control: the submit is in flight, and a plain Button is inert.
		expect(submittingFlag()).toBe('true')

		expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-disabled', 'true')

		const billing = screen.getByRole('tab', { name: 'Billing' })

		expect(billing).not.toHaveAttribute('aria-disabled')

		expect(screen.getByRole('button', { name: 'Copy token' })).not.toHaveAttribute('aria-disabled')

		fireEvent.click(billing)

		expect(onValueChange).toHaveBeenCalledWith('b')

		const pin = screen.getByRole('button', { name: 'Pin' })

		expect(pin).not.toHaveAttribute('aria-disabled')

		fireEvent.click(pin)

		expect(onPressedChange).toHaveBeenCalledWith(true)

		await act(async () => {
			pending.resolve()
		})
	})

	// The lock is context, so it follows the tree into the portal of an overlay.
	// A field there belongs to the form and locks. The standard Close of the
	// default footer writes no field.
	it.each([
		['Dialog', Dialog, DialogPanel],
		['Drawer', Drawer, DrawerPanel],
		['Sheet', Sheet, SheetPanel],
	] as const)(
		'locks the fields of a %s in a submitting form, and keeps its close live',
		async (_, Root, Panel) => {
			const pending = deferred()

			const onOpenChange = vi.fn()

			const { container } = renderUI(
				<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
					<Root open onOpenChange={onOpenChange}>
						<Panel aria-label="Details">
							<Field>
								<Label>Name</Label>
								<Input name="name" />
							</Field>
						</Panel>
					</Root>
				</Form>,
			)

			await submit(container)

			expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('readonly')

			const close = screen.getByRole('button', { name: 'Close' })

			expect(close).not.toHaveAttribute('aria-disabled')

			fireEvent.click(close)

			expect(onOpenChange).toHaveBeenCalledWith(false)

			await act(async () => {
				pending.resolve()
			})
		},
	)

	it('locks the fields of a Popover in a submitting form, and keeps its close live', async () => {
		const pending = deferred()

		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<Popover open onOpenChange={onOpenChange}>
					<PopoverTrigger>Open</PopoverTrigger>
					<PopoverContent>
						<Input name="name" aria-label="Name" />
						<PopoverClose />
					</PopoverContent>
				</Popover>
			</Form>,
		)

		await submit(container)

		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('readonly')

		const close = screen.getByRole('button', { name: 'Close' })

		expect(close).not.toHaveAttribute('aria-disabled')

		fireEvent.click(close)

		expect(onOpenChange).toHaveBeenCalledWith(false)

		await act(async () => {
			pending.resolve()
		})
	})

	it('keeps the close of a CommandPalette live in a submitting form', async () => {
		const pending = deferred()

		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<CommandPalette open onOpenChange={onOpenChange}>
					<div>Items</div>
				</CommandPalette>
			</Form>,
		)

		await submit(container)

		const close = screen.getByRole('button', { name: 'Close' })

		expect(close).not.toHaveAttribute('aria-disabled')

		fireEvent.click(close)

		expect(onOpenChange).toHaveBeenCalledWith(false)

		await act(async () => {
			pending.resolve()
		})
	})

	it('keeps the Cancel of a Confirm live in a submitting form, and locks its action', async () => {
		const pending = deferred()

		const onCancel = vi.fn()

		const onConfirm = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<Confirm
					open
					onOpenChange={() => {}}
					title="Discard the draft?"
					onCancel={onCancel}
					onConfirm={onConfirm}
				/>
			</Form>,
		)

		await submit(container)

		const confirm = screen.getByRole('button', { name: 'Confirm' })

		expect(confirm).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(confirm)

		expect(onConfirm).not.toHaveBeenCalled()

		const cancel = screen.getByRole('button', { name: 'Cancel' })

		expect(cancel).not.toHaveAttribute('aria-disabled')

		fireEvent.click(cancel)

		expect(onCancel).toHaveBeenCalled()

		await act(async () => {
			pending.resolve()
		})
	})

	it('drops a slow submit that resolves after a reset', async () => {
		const pending = deferred<{ fieldErrors: { name: string } }>()

		const onSubmit = vi.fn(() => pending.promise)

		// Captured during render so the reset can be driven programmatically; a
		// FormReset ignores a click while a submit runs.
		let actions: ReturnType<typeof useFormActions>

		function ActionsCapture() {
			actions = useFormActions()

			return null
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<ActionsCapture />
				<FieldProbe name="name" />
				<ValidProbe />
				<SubmittingProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		// The control: the submit is in flight. Without it, every assertion below
		// also holds for a form that never submitted.
		expect(onSubmit).toHaveBeenCalledOnce()

		expect(submittingFlag()).toBe('true')

		// Reset supersedes the in-flight submit and clears its pending state.
		await act(async () => {
			actions?.reset()
		})

		// The handler resolves only now; its stale fieldErrors must be dropped.
		await act(async () => {
			pending.resolve({ fieldErrors: { name: 'taken on the server' } })
		})

		// The value proves that the probe reads a live field. Without it, the missing
		// error below also holds for a probe outside the `Form`.
		expect(getFieldProbe('name').textContent).toBe('Ada')

		expect(getFieldProbe('name')).not.toHaveAttribute('data-error')

		expect(screen.getByTestId('valid').textContent).toBe('true')

		expect(submittingFlag()).toBe('false')
	})

	it('drops a helpers.setErrors call from a submit that a reset superseded', async () => {
		const pending = deferred()

		const onSubmit = vi.fn(async (_values: unknown, helpers: FormHelpers<{ name: string }>) => {
			await pending.promise

			helpers.setErrors({ name: 'taken on the server' })
		})

		let actions: ReturnType<typeof useFormActions>

		function ActionsCapture() {
			actions = useFormActions()

			return null
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit}>
				<ActionsCapture />
				<FieldProbe name="name" />
				<ValidProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onSubmit).toHaveBeenCalledOnce()

		await act(async () => {
			actions?.reset()
		})

		// The handler writes its errors only now, after the reset.
		await act(async () => {
			pending.resolve(undefined)
		})

		expect(getFieldProbe('name').textContent).toBe('Ada')

		expect(getFieldProbe('name')).not.toHaveAttribute('data-error')

		expect(screen.getByTestId('valid').textContent).toBe('true')
	})

	it('keeps its own submit live when onSubmit calls helpers.reset, then settles', async () => {
		const pending = deferred()

		const onReset = vi.fn()

		const onSettled = vi.fn()

		const onSubmit = vi.fn(async (_values: Values, helpers: FormHelpers<Values>) => {
			helpers.reset()

			await pending.promise
		})

		let actions: ReturnType<typeof useFormActions>

		function ActionsCapture() {
			actions = useFormActions()

			return null
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={onSubmit}
				onSettled={onSettled}
				onReset={onReset}
			>
				<ActionsCapture />
				<FieldProbe name="name" />
				<SubmittingProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		act(() => {
			actions?.setValue('name', 'Grace')
		})

		await submit(container)

		// The control: the handler got the edited values. Without it, the
		// outcome below also holds for a submit of the defaults.
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Grace' }, expect.anything())

		// The helper resets the store, but the attempt stays in flight.
		expect(onReset).toHaveBeenCalledOnce()

		expect(getFieldProbe('name').textContent).toBe('Ada')

		expect(submittingFlag()).toBe('true')

		await act(async () => {
			pending.resolve()
		})

		// The outcome carries the submitted values, not the values after the reset.
		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Grace' } })

		expect(submittingFlag()).toBe('false')
	})

	it('reports a throw that follows helpers.reset inside onSubmit', async () => {
		const failure = new Error('save failed')

		const onReset = vi.fn()

		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={(_values: Values, helpers: FormHelpers<Values>) => {
					helpers.reset()

					throw failure
				}}
				onSettled={onSettled}
				onReset={onReset}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onReset).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: false, error: failure })
	})

	it('delivers { ok: true, values } to onSettled when onSubmit returns void', async () => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={() => {}} onSettled={onSettled}>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

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

		await submit(container)

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

		await submit(container)

		expect(onSettled).toHaveBeenCalledTimes(1)

		const outcome = onSettled.mock.calls[0]?.[0] as { ok: false; error: Error }

		expect(outcome.ok).toBe(false)

		expect(outcome.error).toBeInstanceOf(Error)

		expect(outcome.error.message).toBe('boom')
	})

	it('settles with the submitted values when a value changes while onSubmit is pending', async () => {
		const pending = deferred()

		const onSettled = vi.fn()

		let actions: ReturnType<typeof useFormActions>

		function ActionsCapture() {
			actions = useFormActions()

			return null
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={() => pending.promise} onSettled={onSettled}>
				<ActionsCapture />
				<FieldProbe name="name" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		// A write from outside the disabled fieldset, while the submit is in flight.
		act(() => {
			actions?.setValue('name', 'Grace')
		})

		// The control: the write landed. Without it, the outcome below also holds
		// for a write that never happened.
		expect(getFieldProbe('name').textContent).toBe('Grace')

		await act(async () => {
			pending.resolve()
		})

		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Ada' } })
	})

	it('delivers one outcome when onSettled throws on success', async () => {
		const failure = new Error('navigation failed')

		const onSettled = vi.fn((outcome: SubmitOutcome<Values>) => {
			if (outcome.ok) throw failure
		})

		// The hook alone: React drops the promise of a submit handler, so the
		// throw that leaves the handler shows only on that promise.
		const { result } = renderHook(() =>
			useFormReducer<Values>({
				defaultValues: { name: 'Ada' },
				validateOn: 'touched',
				onSubmit: () => {},
				onSettled,
			}),
		)

		let thrown: unknown

		await act(async () => {
			await result.current.handleSubmit(submitEvent()).catch((error: unknown) => {
				thrown = error
			})
		})

		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Ada' } })

		// The throw is not reported as a failed submit, and it is not lost.
		expect(thrown).toBe(failure)
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

		await submit(container)

		expect(onSettled).not.toHaveBeenCalled()
	})

	it.each([
		['an empty map', {}],
		['an undefined entry', { name: undefined }],
		['an empty array entry', { name: [] }],
	])('settles ok: true when the fieldErrors of onSubmit hold %s', async (_, fieldErrors) => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors })}
				onSettled={onSettled}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Ada' } })
	})

	it('clears the field and settles ok: true when a later fieldErrors entry is undefined', async () => {
		const onSettled = vi.fn()

		const onSubmit = vi
			.fn()
			.mockReturnValueOnce({ fieldErrors: { name: 'taken on the server' } })
			.mockReturnValueOnce({ fieldErrors: { name: undefined } })

		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }} onSubmit={onSubmit} onSettled={onSettled}>
				<FieldProbe name="name" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(getFieldProbe('name')).toHaveAttribute('data-error', 'taken on the server')

		expect(onSettled).not.toHaveBeenCalled()

		await submit(container)

		expect(getFieldProbe('name')).not.toHaveAttribute('data-error')

		expect(onSettled).toHaveBeenCalledOnce()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: { name: 'Ada' } })
	})

	it('keeps an empty-string fieldErrors entry mid-flow', async () => {
		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors: { name: '' } })}
				onSettled={onSettled}
			>
				<ValidProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		// `''` normalizes to `['']`, which is an issue.
		expect(screen.getByTestId('valid').textContent).toBe('false')

		expect(onSettled).not.toHaveBeenCalled()
	})

	it('applies fieldErrors returned from onSubmit', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() => ({ fieldErrors: { name: 'taken on the server' } })}
			>
				<FieldProbe name="name" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(getFieldProbe('name')).toHaveAttribute('data-error', 'taken on the server')
	})

	it('keeps a server fieldErrors issue when a sibling field changes', async () => {
		const required = (value: unknown) => (value ? undefined : 'required')

		const { container } = renderUI(
			<Form
				defaultValues={{ address: 'Nowhere', name: 'Home' }}
				validate={{ address: required, name: required }}
				onSubmit={() => ({ fieldErrors: { address: 'That address was not found.' } })}
			>
				<Input name="address" />
				<Input name="name" />
				<FieldProbe name="address" />
				<ValidProbe />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(getFieldProbe('address')).toHaveAttribute('data-error', 'That address was not found.')

		const [address, name] = container.querySelectorAll('input')

		fireEvent.change(name as HTMLInputElement, { target: { value: 'Office' } })

		expect(getFieldProbe('address')).toHaveAttribute('data-error', 'That address was not found.')

		expect(screen.getByTestId('valid').textContent).toBe('false')

		// An edit to the field that carries the issue still clears it.
		fireEvent.change(address as HTMLInputElement, { target: { value: '1 Main St' } })

		expect(getFieldProbe('address')).not.toHaveAttribute('data-error')

		expect(screen.getByTestId('valid').textContent).toBe('true')
	})

	it('reports valid=false once server fieldErrors are applied, with no client validator', async () => {
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

		await submit(container)

		expect(screen.getByTestId('valid').textContent).toBe('false')
	})

	it('marks an object-valued field clean after restoring its structural value', () => {
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
				<FieldProbe name="tags" />
				<Controls />
			</Form>,
		)

		expect(getFieldProbe('tags')).toHaveAttribute('data-dirty', 'false')

		act(() => {
			screen.getByText('mutate').click()
		})

		expect(getFieldProbe('tags')).toHaveAttribute('data-dirty', 'true')

		act(() => {
			screen.getByText('restore').click()
		})

		expect(getFieldProbe('tags')).toHaveAttribute('data-dirty', 'false')
	})

	it('replaces values, and shifts the dirty baseline, when the `values` reference changes', () => {
		function Host() {
			const [values, setValues] = useState({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues({ name: 'Grace' })}>
						sync
					</button>
					<Form defaultValues={{ name: '' }} values={values}>
						<FieldProbe name="name" />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(getFieldProbe('name').textContent).toBe('Ada')

		expect(getFieldProbe('name')).toHaveAttribute('data-dirty', 'false')

		act(() => {
			screen.getByText('sync').click()
		})

		expect(getFieldProbe('name').textContent).toBe('Grace')

		expect(getFieldProbe('name')).toHaveAttribute('data-dirty', 'false')
	})

	it('preserves touched and errors across a controlled values sync', () => {
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
						<FieldProbe name="name" />
					</Form>
				</>
			)
		}

		const { container } = renderUI(<Host />)

		const form = getSlot<HTMLFormElement>(container, 'form')

		// Touch the form so `touched.name` and `errors.name` exist before sync.
		act(() => {
			fireEvent.submit(form)
		})

		expect(getFieldProbe('name')).toHaveAttribute('data-touched', 'true')

		expect(getFieldProbe('name')).toHaveAttribute('data-error', 'required')

		act(() => {
			screen.getByText('sync').click()
		})

		expect(getFieldProbe('name')).toHaveAttribute('data-touched', 'true')

		expect(getFieldProbe('name')).toHaveAttribute('data-error', 'required')
	})

	it('does not re-sync when the values reference is unchanged across renders', () => {
		const stableValues = { name: 'Ada' }

		function Host() {
			const [tick, setTick] = useState(0)

			return (
				<>
					<button type="button" onClick={() => setTick((prev) => prev + 1)}>
						bump · {tick}
					</button>
					<Form defaultValues={{ name: '' }} values={stableValues}>
						<FieldProbe name="name" />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(getFieldProbe('name').textContent).toBe('Ada')

		act(() => {
			screen.getByText(/bump/).click()
		})

		// Same reference → no sync triggered, value still reflects the initial sync.
		expect(getFieldProbe('name').textContent).toBe('Ada')
	})

	it('re-syncs to defaultValues when controlled values transitions back to undefined', () => {
		function Host() {
			const [values, setValues] = useState<{ name: string } | undefined>({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues(undefined)}>
						clear
					</button>
					<Form defaultValues={{ name: 'baseline' }} values={values}>
						<FieldProbe name="name" />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		expect(getFieldProbe('name').textContent).toBe('Ada')

		act(() => {
			screen.getByText('clear').click()
		})

		expect(getFieldProbe('name').textContent).toBe('baseline')
	})

	it('reset(nextDefaults) shifts the baseline and clears errors and touched', () => {
		function Consumer() {
			const actions = useFormActions()

			return (
				<button type="button" onClick={() => actions?.reset({ name: 'Grace' })}>
					reset-new
				</button>
			)
		}

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				validate={{ name: (v) => (v.length === 0 ? 'required' : undefined) }}
			>
				<Consumer />
				<FieldProbe name="name" />
			</Form>,
		)

		const form = getSlot<HTMLFormElement>(container, 'form')

		// Dirty the form and provoke an error before the reset.
		act(() => {
			fireEvent.submit(form)
		})

		expect(getFieldProbe('name')).toHaveAttribute('data-touched', 'true')

		act(() => {
			screen.getByText('reset-new').click()
		})

		expect(getFieldProbe('name').textContent).toBe('Grace')

		expect(getFieldProbe('name')).toHaveAttribute('data-dirty', 'false')

		expect(getFieldProbe('name')).toHaveAttribute('data-touched', 'false')

		expect(getFieldProbe('name')).not.toHaveAttribute('data-error')
	})

	it('reset() with no args reverts to the original defaultValues', () => {
		function Consumer() {
			const actions = useFormActions()

			return (
				<>
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
				<Consumer />
				<FieldProbe name="name" />
			</Form>,
		)

		act(() => {
			screen.getByText('mutate').click()
		})

		expect(getFieldProbe('name').textContent).toBe('Grace')

		act(() => {
			screen.getByText('reset').click()
		})

		expect(getFieldProbe('name').textContent).toBe('Ada')
	})
})

describe('useFormReducer controlled sync', () => {
	/** Renders the hook with a controlled `values` prop, and records each commit. */
	function renderControlled(initial: Values) {
		const commits: Array<{ prop: Values; state: Record<string, unknown> }> = []

		const view = renderHook(
			({ values }: { values: Values }) => {
				const result = useFormReducer<Values>({
					defaultValues: { name: '' },
					values,
					validateOn: 'touched',
				})

				useLayoutEffect(() => {
					commits.push({ prop: values, state: result.formState.values })
				})

				return result
			},
			{ initialProps: { values: initial } },
		)

		return { ...view, commits }
	}

	it('never commits a controlled change with the values from before it', () => {
		const { rerender, commits } = renderControlled({ name: 'Ada' })

		rerender({ values: { name: 'Grace' } })

		expect(commits.map(({ prop, state }) => [prop.name, state.name])).toEqual([
			['Ada', 'Ada'],
			['Grace', 'Grace'],
		])
	})

	it('publishes to the store once per controlled change', () => {
		const { result, rerender } = renderControlled({ name: 'Ada' })

		const listener = vi.fn()

		const unsubscribe = result.current.store.subscribe(listener)

		const next = { name: 'Grace' }

		rerender({ values: next })

		expect(listener).toHaveBeenCalledOnce()

		expect(result.current.store.getState().values).toBe(next)

		unsubscribe()
	})

	it('reads the same value from getValue as the field slice in each render', () => {
		const renders: Array<[unknown, unknown]> = []

		function Reader() {
			const actions = useFormActions()

			const field = useFormField('name')

			renders.push([actions?.getValue('name'), field?.value])

			return (
				<button type="button" onClick={() => actions?.setValue('name', 'Lin')}>
					write
				</button>
			)
		}

		function Host() {
			const [values, setValues] = useState({ name: 'Ada' })

			return (
				<>
					<button type="button" onClick={() => setValues({ name: 'Grace' })}>
						sync
					</button>
					<Form defaultValues={{ name: '' }} values={values}>
						<Reader />
					</Form>
				</>
			)
		}

		renderUI(<Host />)

		act(() => {
			screen.getByText('sync').click()
		})

		act(() => {
			screen.getByText('write').click()
		})

		for (const [read, slice] of renders) expect(read).toBe(slice)

		expect(renders.map(([read]) => read)).toEqual(expect.arrayContaining(['Ada', 'Grace', 'Lin']))

		expect(renders.at(-1)).toEqual(['Lin', 'Lin'])
	})
})

describe('form hooks outside a Form', () => {
	it.each<[string, () => unknown]>([
		['useFormContext returns undefined', () => useFormContext()],
		['useFormActions returns undefined', () => useFormActions()],
		['useFormState returns undefined', () => useFormState()],
		['useFormField returns undefined', () => useFormField('name')],
		['useFormStatus returns undefined', () => useFormStatus()],
	])('%s', (_name, useHook) => {
		const { result } = renderHook(useHook)

		expect(result.current).toBeUndefined()
	})
})

describe('useFormContext', () => {
	it('returns combined state + actions inside a Form', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result } = renderHook(() => useFormContext(), { wrapper })

		expect(result.current?.values).toEqual({ name: 'Ada' })

		expect(typeof result.current?.setValue).toBe('function')

		expect(result.current?.dirty).toBe(false)
	})
})

describe('useFormActions', () => {
	it('returns a stable actions object across re-renders', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result, rerender } = renderHook(() => useFormActions(), { wrapper })

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('keeps the actions identity when onReset changes, and calls the newest onReset', () => {
		const firstOnReset = vi.fn()

		const nextOnReset = vi.fn()

		let onReset = firstOnReset

		const wrapper = ({ children }: { children: ReactNode }) => (
			<Form defaultValues={{ name: 'Ada' }} onReset={onReset}>
				{children}
			</Form>
		)

		const { result, rerender } = renderHook(() => useFormActions(), { wrapper })

		const first = result.current

		onReset = nextOnReset

		rerender()

		expect(result.current).toBe(first)

		act(() => result.current?.reset())

		expect(firstOnReset).not.toHaveBeenCalled()

		expect(nextOnReset).toHaveBeenCalledOnce()
	})
})

describe('useFormState', () => {
	it('reflects current values', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result } = renderHook(() => useFormState(), { wrapper })

		expect(result.current?.values).toEqual({ name: 'Ada' })
	})
})

describe('useFormField', () => {
	it('returns undefined when name is missing', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result } = renderHook(() => useFormField(undefined), { wrapper })

		expect(result.current).toBeUndefined()
	})

	it('updates value via setValue and dirties the field', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

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
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result } = renderHook(() => useFormField('name'), { wrapper })

		expect(result.current?.touched).toBe(false)

		act(() => {
			result.current?.setTouched()
		})

		expect(result.current?.touched).toBe(true)
	})
})

describe('useInputValue bound to a Form field', () => {
	it('updates the form value and calls external onChange', () => {
		const onChange = vi.fn()

		const wrapper = makeFormWrapper({ defaultValues: { name: '' } })

		const { result } = renderHook(
			() => useInputValue<HTMLInputElement>({ name: 'name', onChange }),
			{
				wrapper,
			},
		)

		expect(result.current.value).toBe('')

		act(() => {
			result.current.onChange?.(
				makeChangeEvent<HTMLInputElement>({
					target: { value: 'hello' } as HTMLInputElement,
				}),
			)
		})

		expect(result.current.value).toBe('hello')

		expect(onChange).toHaveBeenCalled()
	})

	it('marks the field as touched and calls external onBlur', () => {
		const onBlur = vi.fn()

		const wrapper = makeFormWrapper({ defaultValues: { name: '' } })

		const { result } = renderHook(() => useInputValue<HTMLInputElement>({ name: 'name', onBlur }), {
			wrapper,
		})

		act(() => {
			result.current.onBlur?.(makeFocusEvent<HTMLInputElement>())
		})

		expect(onBlur).toHaveBeenCalledOnce()
	})
})

describe('useFormStatus', () => {
	it('returns form-level status flags', () => {
		const wrapper = makeFormWrapper({ defaultValues: { name: 'Ada' } })

		const { result } = renderHook(() => useFormStatus(), { wrapper })

		expect(result.current).toEqual({ submitting: false, dirty: false, valid: true })
	})
})

/** Renders `aria-invalid` from the committed field state, so the DOM shows it only after React commits. */
function InvalidProbe({ name }: { name: string }) {
	const field = useFormField(name)

	return (
		<output data-slot="probe" aria-invalid={field?.errors?.length ? 'true' : undefined}>
			{name}
		</output>
	)
}

describe('Form onInvalidSubmit', () => {
	// A refused submit reaches neither `onSubmit` nor a terminal outcome, so this
	// report is the only signal the attempt happened at all.
	it('reports the failed fields and skips onSubmit and onSettled', async () => {
		const onInvalidSubmit = vi.fn()

		const onSubmit = vi.fn()

		const onSettled = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '', email: 'ada@example.com' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onSubmit={onSubmit}
				onSettled={onSettled}
				onInvalidSubmit={onInvalidSubmit}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onInvalidSubmit).toHaveBeenCalledExactlyOnceWith({ name: ['required'] })

		expect(onSubmit).not.toHaveBeenCalled()

		expect(onSettled).not.toHaveBeenCalled()
	})

	// The clean field validated too, and its entry in the errors map is
	// `undefined`. The payload is the refused partition, so it holds neither the
	// clean field nor an empty issue list.
	it('carries only the fields that failed', async () => {
		const onInvalidSubmit = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '', email: '' }}
				validate={{
					name: (value) => (value ? undefined : 'required'),
					email: () => undefined,
				}}
				onInvalidSubmit={onInvalidSubmit}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onInvalidSubmit).toHaveBeenCalledExactlyOnceWith({ name: ['required'] })
	})

	// The documented use is to scroll to the first error, so the fields must
	// already carry aria-invalid by the time the report lands.
	it('reports after the errors are committed to the DOM', async () => {
		const marked: number[] = []

		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onInvalidSubmit={() => marked.push(document.querySelectorAll('[aria-invalid]').length)}
			>
				<InvalidProbe name="name" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(marked).toEqual([1])
	})

	it('says nothing when every validator passes', async () => {
		const onInvalidSubmit = vi.fn()

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				validate={{ name: (value) => (value ? undefined : 'required') }}
				onSubmit={() => {}}
				onInvalidSubmit={onInvalidSubmit}
			>
				<button type="submit">Submit</button>
			</Form>,
		)

		await submit(container)

		expect(onInvalidSubmit).not.toHaveBeenCalled()
	})
})

describe('Form native validation', () => {
	// A native constraint (`type="url"`, `required`) would stop the submit in the
	// browser before the validators run, so only one field shows its error, and
	// the browser bubble takes the place of the app message.
	it('runs the validators on a value that a native constraint refuses', async () => {
		const user = setupUser()

		const onInvalidSubmit = vi.fn()

		renderUI(
			<Form
				defaultValues={{ url: 'foo', name: '' }}
				validate={{
					url: () => 'That is not a web address.',
					name: (value) => (value ? undefined : 'required'),
				}}
				onInvalidSubmit={onInvalidSubmit}
			>
				<input type="url" defaultValue="foo" aria-label="Website" />
				<button type="submit">Submit</button>
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onInvalidSubmit).toHaveBeenCalledExactlyOnceWith({
			url: ['That is not a web address.'],
			name: ['required'],
		})
	})

	it('lets the consumer turn native validation back on', () => {
		const { container } = renderUI(
			<Form defaultValues={{}} noValidate={false}>
				<span />
			</Form>,
		)

		expect(getSlot<HTMLFormElement>(container, 'form').noValidate).toBe(false)
	})
})

describe('Form focus during a submit', () => {
	it('keeps the focus on the submit button, which stays enabled', async () => {
		const pending = deferred<void>()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<FormSubmit>Save</FormSubmit>
			</Form>,
		)

		const button = getSlot<HTMLButtonElement>(container, 'form-submit')

		button.focus()

		await submit(container)

		// The control: the submit is in flight.
		expect(button).toHaveAttribute('aria-busy', 'true')

		expect(button).toBeEnabled()

		expect(button).toHaveFocus()

		await act(async () => {
			pending.resolve()
		})

		expect(button).toHaveFocus()
	})

	it('keeps the focus on a field that an Enter submits, which stays enabled', async () => {
		const pending = deferred<void>()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<Input name="name" aria-label="Name" />
			</Form>,
		)

		const input = screen.getByRole('textbox', { name: 'Name' })

		input.focus()

		await submit(container)

		expect(input).toHaveAttribute('readonly')

		expect(input).toBeEnabled()

		expect(input).toHaveFocus()

		await act(async () => {
			pending.resolve()
		})

		expect(input).toHaveFocus()
	})
})
