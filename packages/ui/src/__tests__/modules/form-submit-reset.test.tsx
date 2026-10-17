import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from '../../components/input'
import { Form, FormReset, FormSubmit } from '../../modules/form'
import { deferred, fireEvent, getSlot, renderUI } from '../helpers'

describe('FormSubmit', () => {
	it('renders a submit button with data-slot="form-submit"', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<FormSubmit>Save</FormSubmit>
			</Form>,
		)

		const button = getSlot(container, 'form-submit')

		expect(button.tagName).toBe('BUTTON')

		expect(button).toHaveAttribute('type', 'submit')

		expect(button).not.toHaveAttribute('aria-busy')
	})

	it('shows the loading state while a submit is in flight', async () => {
		const pending = deferred<void>()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onSubmit={() => pending.promise}>
				<FormSubmit>Save</FormSubmit>
			</Form>,
		)

		await act(async () => {
			fireEvent.submit(getSlot(container, 'form'))
		})

		expect(getSlot(container, 'form-submit')).toHaveAttribute('aria-busy', 'true')

		await act(async () => {
			pending.resolve()
		})

		expect(getSlot(container, 'form-submit')).not.toHaveAttribute('aria-busy')
	})

	it('takes the loading state from its prop as well', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<FormSubmit loading>Save</FormSubmit>
			</Form>,
		)

		expect(getSlot(container, 'form-submit')).toHaveAttribute('aria-busy', 'true')
	})

	it('renders a plain submit button outside a Form', () => {
		const { container } = renderUI(<FormSubmit>Save</FormSubmit>)

		expect(getSlot(container, 'form-submit')).toHaveAttribute('type', 'submit')
	})
})

describe('FormReset', () => {
	it('is aria-disabled while the form is clean, and stays enabled', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<FormReset>Discard</FormReset>
			</Form>,
		)

		const button = getSlot(container, 'form-reset')

		expect(button).toHaveAttribute('type', 'reset')

		expect(button).toHaveAttribute('aria-disabled', 'true')

		expect(button).toHaveAttribute('data-disabled')

		expect(button).toBeEnabled()
	})

	it('resets a dirty form, and turns aria-disabled again', () => {
		const onReset = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onReset={onReset}>
				<Input name="name" />
				<FormReset>Discard</FormReset>
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'input')

		fireEvent.change(input, { target: { value: 'Jane' } })

		const button = getSlot(container, 'form-reset')

		expect(button).not.toHaveAttribute('aria-disabled')

		fireEvent.click(button)

		expect(onReset).toHaveBeenCalledOnce()

		expect(input.value).toBe('')

		expect(button).toHaveAttribute('aria-disabled', 'true')
	})

	it('does not reset a clean form on a click', () => {
		const onReset = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }} onReset={onReset}>
				<FormReset>Discard</FormReset>
			</Form>,
		)

		fireEvent.click(getSlot(container, 'form-reset'))

		expect(onReset).not.toHaveBeenCalled()
	})

	it('runs the consumer onClick first', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ name: '' }}>
				<FormReset onClick={onClick}>Discard</FormReset>
			</Form>,
		)

		fireEvent.click(getSlot(container, 'form-reset'))

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('renders a plain reset button outside a Form', () => {
		const { container } = renderUI(<FormReset>Discard</FormReset>)

		const button = getSlot(container, 'form-reset')

		expect(button).toHaveAttribute('type', 'reset')

		expect(button).not.toHaveAttribute('aria-disabled')
	})
})
