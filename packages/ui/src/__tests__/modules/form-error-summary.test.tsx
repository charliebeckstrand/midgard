import { act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../../components/checkbox'
import { ColorPicker } from '../../components/color'
import { Combobox } from '../../components/combobox'
import { useControlTarget } from '../../components/control/use-control-target'
import { DatePicker } from '../../components/date-picker'
import { Field, Label, Message } from '../../components/fieldset'
import { FileUploadButton } from '../../components/file-upload'
import { Input } from '../../components/input'
import { Listbox } from '../../components/listbox'
import { Rating } from '../../components/rating'
import { SignaturePad } from '../../components/signature-pad'
import { RangeSlider, Slider } from '../../components/slider'
import { Switch } from '../../components/switch'
import { TagInput } from '../../components/tag-input'
import {
	Form,
	FormErrorSummary,
	FormFilters,
	FormFiltersField,
	type FormProps,
	useFormValue,
} from '../../modules/form'
import { LocaleProvider } from '../../providers/locale'
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

/** The link of the error summary whose accessible name is `name`. */
function summaryLink(container: HTMLElement, name: string): HTMLElement {
	return within(getSlot(container, 'form-error-summary')).getByRole('link', { name })
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

		const link = summaryLink(container, 'Enter a name.')

		expect(link).toHaveAttribute('href', '#name-control')

		fireEvent.click(link)

		expect(container.querySelector('#name-control')).toHaveFocus()
	})

	it('links a field with no bound Message through its control', async () => {
		const { container } = renderSignup()

		await submit(container)

		const link = summaryLink(container, 'Enter an email address.')

		const email = within(container).getByRole('textbox', { name: 'Email' })

		expect(link).toHaveAttribute('href', `#${email.id}`)

		fireEvent.click(link)

		expect(email).toHaveFocus()
	})

	it('links a file upload with no bound Message to its hidden input', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ files: [] }} validate={{ files: () => 'Attach a file.' }}>
				<FormErrorSummary />
				<Field htmlFor="files-control">
					<Label>Files</Label>
					<FileUploadButton name="files" />
				</Field>
			</Form>,
		)

		await submit(container)

		const link = summaryLink(container, 'Attach a file.')

		expect(link).toHaveAttribute('href', '#files-control')

		fireEvent.click(link)

		expect(container.querySelector('#files-control')).toHaveFocus()
	})

	it('shows the issue of a field with no registered control as text', async () => {
		/** A field that binds through useFormValue, and renders no library control. */
		function CustomField() {
			const { value, setValue } = useFormValue<string>('name', {})

			return (
				<input
					aria-label="Custom"
					value={value ?? ''}
					onChange={(event) => setValue(event.target.value)}
				/>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} validate={{ name: () => 'Enter a name.' }}>
				<FormErrorSummary />
				<CustomField />
			</Form>,
		)

		await submit(container)

		const summary = getSlot(container, 'form-error-summary')

		expect(within(summary).queryByRole('link')).toBeNull()

		expect(within(summary).getByText('Enter a name.')).toBeInTheDocument()
	})

	it('focuses the first focusable element of a control whose id is on a wrapper', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ score: 0 }} validate={{ score: () => 'Rate the stay.' }}>
				<FormErrorSummary />
				<Field>
					<Label>Score</Label>
					<Rating name="score" />
				</Field>
			</Form>,
		)

		await submit(container)

		fireEvent.click(summaryLink(container, 'Rate the stay.'))

		const focused = document.activeElement as HTMLElement

		expect(getSlot(container, 'rating').contains(focused)).toBe(true)
	})

	it('skips a disabled control in a wrapper and focuses the next one in the tab order', async () => {
		function Wrapped() {
			useControlTarget('code', 'code-wrapper')

			return (
				<div id="code-wrapper">
					<button type="button" disabled>
						Paste
					</button>
					<input aria-label="Code" />
				</div>
			)
		}

		const { container } = renderUI(
			<Form defaultValues={{ code: '' }} validate={{ code: () => 'Enter the code.' }}>
				<FormErrorSummary />
				<Wrapped />
			</Form>,
		)

		await submit(container)

		fireEvent.click(summaryLink(container, 'Enter the code.'))

		expect(document.activeElement).toHaveAccessibleName('Code')
	})

	// A bare control has no id from a Field, a Control, or a prop. It renders an
	// id that it makes, and registers that id.
	it.each<[string, unknown, ReactNode]>([
		['Input', '', <Input key="control" name="field" aria-label="Field" />],
		['Checkbox', false, <Checkbox key="control" name="field" aria-label="Field" />],
		['Switch', false, <Switch key="control" name="field" aria-label="Field" />],
		['Slider', 0, <Slider key="control" name="field" aria-label="Field" />],
		['Rating', 0, <Rating key="control" name="field" aria-label="Field" />],
		['RangeSlider', [0, 100], <RangeSlider key="control" name="field" />],
		['DatePicker', null, <DatePicker key="control" name="field" aria-label="Field" />],
		['ColorPicker', null, <ColorPicker key="control" name="field" aria-label="Field" />],
		[
			'Listbox',
			null,
			<Listbox key="control" name="field" aria-label="Field">
				<div>Option</div>
			</Listbox>,
		],
		[
			'Combobox',
			null,
			<Combobox<string> key="control" name="field" displayValue={(v) => v} aria-label="Field">
				<div>Option</div>
			</Combobox>,
		],
		['TagInput', [], <TagInput key="control" name="field" aria-label="Field" />],
		['SignaturePad', null, <SignaturePad key="control" name="field" aria-label="Field" />],
	])('links a bare %s to the id that it renders', async (_, value, control) => {
		const { container } = renderUI(
			<Form defaultValues={{ field: value }} validate={{ field: () => 'Fix the field.' }}>
				<FormErrorSummary />
				{control}
			</Form>,
		)

		await submit(container)

		const link = summaryLink(container, 'Fix the field.')

		const id = link.getAttribute('href')?.slice(1) ?? ''

		expect(id).not.toBe('')

		expect(document.getElementById(id)).toBeInTheDocument()

		fireEvent.click(link)

		const target = document.getElementById(id) as HTMLElement

		expect(target.contains(document.activeElement)).toBe(true)
	})

	it('keeps a field of a filter bar out of the targets of the form', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} validate={{ name: () => 'Enter a name.' }}>
				<FormErrorSummary />
				<FormFilters aria-label="Filters" defaultValue={{ name: undefined }}>
					<FormFiltersField name="name">
						<Label>Search</Label>
						<Input />
					</FormFiltersField>
				</FormFilters>
			</Form>,
		)

		await submit(container)

		expect(
			within(getSlot(container, 'form-error-summary')).queryByRole('link', {
				name: 'Enter a name.',
			}),
		).toBeNull()
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

		expect(summaryLink(container, 'This name is taken.')).toBeInTheDocument()

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

describe('FormErrorSummary in a locale', () => {
	it('gives the default title in the language of the locale', async () => {
		const { container } = renderUI(
			<LocaleProvider locale="es-ES">
				<Form defaultValues={{ name: '' }} validate={{ name: () => 'Introduce un nombre.' }}>
					<FormErrorSummary />
				</Form>
			</LocaleProvider>,
		)

		await submit(container)

		expect(
			within(getSlot(container, 'form-error-summary')).getByText('Hay un problema'),
		).toBeInTheDocument()
	})
})
