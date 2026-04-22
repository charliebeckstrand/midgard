import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
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
})
