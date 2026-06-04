import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Description, Field, Fieldset, Label, Legend, Message } from '../../components/fieldset'
import { Form } from '../../components/form'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Fieldset', () => {
	it('renders with data-slot="fieldset"', () => {
		const { container } = renderUI(<Fieldset>content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FIELDSET')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Fieldset className="custom">content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Fieldset id="test">content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('Legend', () => {
	it('renders with data-slot="legend"', () => {
		const { container } = renderUI(
			<Fieldset>
				<Legend>Title</Legend>
			</Fieldset>,
		)

		expect(bySlot(container, 'legend')).toBeInTheDocument()

		expect(screen.getByText('Title')).toBeInTheDocument()
	})
})

describe('Field', () => {
	it('renders with data-slot="field"', () => {
		const { container } = renderUI(<Field>content</Field>)

		expect(bySlot(container, 'field')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Field className="custom">content</Field>)

		const el = bySlot(container, 'field')

		expect(el?.className).toContain('custom')
	})

	it('marks data-disabled when the disabled prop is set', () => {
		const { container } = renderUI(<Field disabled>content</Field>)

		expect(bySlot(container, 'field')).toHaveAttribute('data-disabled')
	})
})

describe('Label', () => {
	it('renders with data-slot="label"', () => {
		const { container } = renderUI(<Label>Name</Label>)

		expect(bySlot(container, 'label')).toBeInTheDocument()

		expect(screen.getByText('Name')).toBeInTheDocument()
	})
})

describe('Description', () => {
	it('renders with data-slot="description"', () => {
		const { container } = renderUI(<Description>Help text</Description>)

		expect(bySlot(container, 'description')).toBeInTheDocument()

		expect(screen.getByText('Help text')).toBeInTheDocument()
	})
})

describe('Message', () => {
	it('renders with data-slot="message" and defaults to the error variant', () => {
		const { container } = renderUI(<Message>Required</Message>)

		const el = bySlot(container, 'message')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('data-variant', 'error')

		expect(screen.getByText('Required')).toBeInTheDocument()
	})

	it('renders the success variant', () => {
		const { container } = renderUI(<Message variant="success">Looks good</Message>)

		expect(bySlot(container, 'message')).toHaveAttribute('data-variant', 'success')

		expect(screen.getByText('Looks good')).toBeInTheDocument()
	})

	it('applies a custom className', () => {
		const { container } = renderUI(<Message className="custom">oops</Message>)

		expect(bySlot(container, 'message')?.className).toContain('custom')
	})

	it('respects an explicit id when provided', () => {
		const { container } = renderUI(<Message id="m1">oops</Message>)

		expect(bySlot(container, 'message')).toHaveAttribute('id', 'm1')
	})

	it('renders nothing when bound to a form field that has no error', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }}>
				<Message name="name">fallback</Message>
			</Form>,
		)

		expect(bySlot(container, 'message')).toBeNull()
	})

	it('renders the form field error when bound and the field has an error', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				onSubmit={(_v, helpers: { setErrors: (e: Record<string, string | string[]>) => void }) => {
					helpers.setErrors({ name: 'required' })
				}}
			>
				<Message name="name">fallback</Message>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		const message = bySlot(container, 'message') as HTMLElement

		expect(message.textContent).toBe('required')
	})

	it('lists every field error when bound with the all prop', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				onSubmit={(_v, helpers: { setErrors: (e: Record<string, string | string[]>) => void }) => {
					helpers.setErrors({ name: ['Too short', 'Required'] })
				}}
			>
				<Message name="name" all>
					fallback
				</Message>
				<button type="submit">Submit</button>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		const message = bySlot(container, 'message') as HTMLElement

		expect(message.tagName).toBe('UL')

		expect(message.querySelectorAll('li')).toHaveLength(2)

		expect(message.textContent).toContain('Too short')

		expect(message.textContent).toContain('Required')
	})

	it('renders a single error as a paragraph even with the all prop', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				onSubmit={(_v, helpers: { setErrors: (e: Record<string, string | string[]>) => void }) => {
					helpers.setErrors({ name: 'Required' })
				}}
			>
				<Message name="name" all>
					fallback
				</Message>
				<button type="submit">Submit</button>
			</Form>,
		)

		await act(async () => {
			fireEvent.submit(bySlot(container, 'form') as HTMLFormElement)
		})

		const message = bySlot(container, 'message') as HTMLElement

		expect(message.tagName).toBe('P')

		expect(message.textContent).toBe('Required')
	})

	it('renders verbatim children for the success variant inside a form', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }}>
				<Message variant="success" name="name">
					Looks good
				</Message>
			</Form>,
		)

		expect(bySlot(container, 'message')?.textContent).toBe('Looks good')
	})
})
