import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Field, Label, Message } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Form, FormErrorSummary, type FormProps } from '../../modules/form'
import { bySlot, fireEvent, getSlot, renderUI, within } from '../helpers'

type Values = { name: string; email: string }

const validate: FormProps<Values>['validate'] = {
	name: (value) => (value ? undefined : 'Enter a name.'),
	email: (value) => (value.includes('@') ? undefined : 'Enter an email address.'),
}

/** A form with a summary, two bound fields, and a Message for the name only. */
function renderSignup(props: Partial<FormProps<Values>> = {}) {
	return renderUI(
		<Form<Values>
			defaultValues={{ name: '', email: '' }}
			validate={validate}
			validateOn="submit"
			{...props}
		>
			<FormErrorSummary />
			<Field htmlFor="name-control">
				<Label>Name</Label>
				<Input name="name" />
				<Message name="name" />
			</Field>
			<Field>
				<Label>Email</Label>
				<Input name="email" />
			</Field>
		</Form>,
	)
}

async function submit(container: HTMLElement) {
	await act(async () => {
		fireEvent.submit(getSlot(container, 'form'))
	})
}

describe('FormErrorSummary', () => {
	it('renders nothing before a submit fails', () => {
		const { container } = renderSignup()

		expect(bySlot(container, 'form-error-summary')).toBeNull()
	})

	it('lists the first issue of each invalid field after a refused submit', async () => {
		const { container } = renderSignup()

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		expect(summary).toHaveAttribute('role', 'alert')

		expect(within(summary).getByText('There is a problem')).toBeInTheDocument()

		const items = within(summary).getAllByRole('listitem')

		expect(items.map((item) => item.textContent)).toEqual([
			'Enter a name.',
			'Enter an email address.',
		])
	})

	it('takes the focus after a refused submit', async () => {
		const { container } = renderSignup()

		await submit(container)

		expect(getSlot(container, 'form-error-summary')).toHaveFocus()
	})

	it('lets an onInvalidSubmit that moves the focus win', async () => {
		const onInvalidSubmit = vi.fn(() => {
			document.querySelector<HTMLInputElement>('input[name="email"]')?.focus()
		})

		const { container } = renderSignup({ onInvalidSubmit })

		await submit(container)

		expect(container.querySelector('input[name="email"]')).toHaveFocus()
	})

	it('links a field with a bound Message to its control, and moves the focus there', async () => {
		const { container } = renderSignup()

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		const link = within(summary).getByRole('link', { name: 'Enter a name.' })

		expect(link).toHaveAttribute('href', '#name-control')

		fireEvent.click(link)

		expect(container.querySelector('#name-control')).toHaveFocus()
	})

	it('shows the issue of a field with no bound Message as text', async () => {
		const { container } = renderSignup()

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		expect(within(summary).queryByRole('link', { name: 'Enter an email address.' })).toBeNull()

		expect(within(summary).getByText('Enter an email address.')).toBeInTheDocument()
	})

	it('drops a row when its field becomes valid, and goes with the last row', async () => {
		const { container } = renderSignup({ validateOn: 'change' })

		await submit(container)

		fireEvent.change(within(container).getByRole('textbox', { name: 'Name' }), {
			target: { value: 'Jane' },
		})

		const summary = getSlot(container, 'form-error-summary')

		expect(within(summary).getAllByRole('listitem')).toHaveLength(1)

		fireEvent.change(within(container).getByRole('textbox', { name: 'Email' }), {
			target: { value: 'jane@example.com' },
		})

		expect(bySlot(container, 'form-error-summary')).toBeNull()
	})

	it('opens after a handler returns a field issue', async () => {
		const { container } = renderSignup({
			defaultValues: { name: 'Jane', email: 'jane@example.com' },
			onSubmit: () => ({ fieldErrors: { name: 'This name is taken.' } }),
		})

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		expect(within(summary).getByRole('link', { name: 'This name is taken.' })).toBeInTheDocument()

		expect(summary).toHaveFocus()
	})

	it('closes on a reset, and stays closed until the next failure', async () => {
		const { container } = renderSignup({ validateOn: 'change' })

		await submit(container)

		expect(getSlot(container, 'form-error-summary')).toBeInTheDocument()

		await act(async () => {
			fireEvent.reset(getSlot(container, 'form'))
		})

		expect(bySlot(container, 'form-error-summary')).toBeNull()

		// A validation after the reset gives an issue, but no submit failed.
		const name = getSlot<HTMLInputElement>(container, 'input')

		fireEvent.change(name, { target: { value: 'Jane' } })

		fireEvent.change(name, { target: { value: '' } })

		expect(bySlot(container, 'form-error-summary')).toBeNull()

		await submit(container)

		expect(getSlot(container, 'form-error-summary')).toBeInTheDocument()
	})

	it('takes a custom title', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} validate={{ name: () => 'Enter a name.' }}>
				<FormErrorSummary title="Check the form" />
			</Form>,
		)

		await submit(container)

		expect(
			within(getSlot(container, 'form-error-summary')).getByText('Check the form'),
		).toBeInTheDocument()
	})

	it('renders nothing outside a Form', () => {
		const { container } = renderUI(<FormErrorSummary />)

		expect(container).toBeEmptyDOMElement()
	})
})
