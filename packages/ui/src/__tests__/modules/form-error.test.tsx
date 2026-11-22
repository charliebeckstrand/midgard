import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import {
	Form,
	FormError,
	FormErrorSummary,
	type FormProps,
	useFormActions,
	type ZodLike,
	zodResolver,
} from '../../modules/form'
import { bySlot, fireEvent, getSlot, renderUI, screen } from '../helpers'

type Values = { email: string; password: string }

const defaults: Values = { email: 'a@b.c', password: 'x' }

/** A form with the issue of the whole form, two bound fields, and an optional summary. */
function renderLogin(props: Partial<FormProps<Values>> = {}, summary = false) {
	return renderUI(
		<Form<Values> defaultValues={defaults} {...props}>
			{summary ? <FormErrorSummary /> : <FormError />}
			<Field>
				<Label>Email</Label>
				<Input name="email" />
			</Field>
			<Field>
				<Label>Password</Label>
				<Input name="password" />
			</Field>
		</Form>,
	)
}

async function submit(container: HTMLElement) {
	await act(async () => {
		fireEvent.submit(getSlot(container, 'form'))
	})
}

describe('FormError', () => {
	it('renders nothing while the form has no issue of the whole form', () => {
		const { container } = renderLogin()

		expect(bySlot(container, 'form-error')).toBeNull()
	})

	it('shows a { formError } return as an alert, and keeps the attempt mid-flow', async () => {
		const onSettled = vi.fn()

		const { container } = renderLogin({
			onSubmit: () => ({ formError: 'Invalid credentials' }),
			onSettled,
		})

		await submit(container)

		const alert = getSlot(container, 'form-error')

		expect(alert).toHaveTextContent('Invalid credentials')

		expect(alert).toHaveAttribute('role', 'alert')

		// An issue of the whole form is no success.
		expect(onSettled).not.toHaveBeenCalled()
	})

	it('treats an empty formError as no issue, so the submit settles', async () => {
		const onSettled = vi.fn()

		const { container } = renderLogin({ onSubmit: () => ({ formError: '' }), onSettled })

		await submit(container)

		expect(bySlot(container, 'form-error')).toBeNull()

		expect(onSettled).toHaveBeenCalledWith({ ok: true, values: defaults })
	})

	it('shows the issue from helpers.setFormError', async () => {
		const { container } = renderLogin({
			onSubmit: (_values, helpers) => helpers.setFormError('The server is down'),
		})

		await submit(container)

		expect(getSlot(container, 'form-error')).toHaveTextContent('The server is down')
	})

	it('clears the issue on the next submit, on a reset, and on the close button', async () => {
		let answer: string | undefined = 'Invalid credentials'

		const { container } = renderLogin({ onSubmit: () => ({ formError: answer }) })

		await submit(container)

		answer = undefined

		await submit(container)

		expect(bySlot(container, 'form-error')).toBeNull()

		answer = 'Invalid credentials'

		await submit(container)

		await act(async () => {
			fireEvent.reset(getSlot(container, 'form'))
		})

		expect(bySlot(container, 'form-error')).toBeNull()

		await submit(container)

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(bySlot(container, 'form-error')).toBeNull()
	})

	it('sets and clears the issue through useFormActions', () => {
		function Trigger() {
			const actions = useFormActions()

			return (
				<button type="button" onClick={() => actions?.setFormError('Session expired')}>
					Expire
				</button>
			)
		}

		const { container } = renderUI(
			<Form<Values> defaultValues={defaults}>
				<FormError />
				<Trigger />
			</Form>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Expire' }))

		expect(getSlot(container, 'form-error')).toHaveTextContent('Session expired')
	})

	it('refuses a submit on an issue of the whole form from a zodResolver schema', async () => {
		// A schema whose rule over the whole record has no field (`path: []`).
		const schema: ZodLike = {
			safeParse: (input) =>
				(input as Values).password === 'x'
					? {
							success: false,
							error: { issues: [{ path: [], message: 'Pick a stronger password' }] },
						}
					: { success: true },
		}

		const onSubmit = vi.fn()

		const { container } = renderLogin({ validate: zodResolver(schema, defaults), onSubmit })

		await submit(container)

		expect(onSubmit).not.toHaveBeenCalled()

		expect(getSlot(container, 'form-error')).toHaveTextContent('Pick a stronger password')
	})
})

describe('FormErrorSummary with an issue of the whole form', () => {
	it('lists the issue first, as text, and takes the focus', async () => {
		const { container } = renderLogin(
			{ onSubmit: () => ({ formError: 'Invalid credentials', fieldErrors: { email: 'Unknown' } }) },
			true,
		)

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		const rows = summary.querySelectorAll('li')

		expect(rows[0]).toHaveTextContent('Invalid credentials')

		expect(rows[0]?.querySelector('a')).toBeNull()

		expect(rows[1]).toHaveTextContent('Unknown')

		expect(summary).toHaveFocus()
	})
})
