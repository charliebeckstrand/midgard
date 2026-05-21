import { describe, expect, it } from 'vitest'
import { Form } from '../../components/form'
import { SubmitButton } from '../../components/submit-button'
import { act, bySlot, fireEvent, renderUI, screen, waitFor } from '../helpers'

describe('SubmitButton', () => {
	it('renders as a submit-typed button', () => {
		const { container } = renderUI(<SubmitButton>Save</SubmitButton>)

		const button = container.querySelector('button')

		expect(button).toHaveAttribute('type', 'submit')
	})

	it('renders outside a Form without throwing', () => {
		const { container } = renderUI(<SubmitButton>Save</SubmitButton>)

		expect(container.querySelector('button')).toBeInTheDocument()
	})

	it('does not auto-disable when the enclosing form is invalid', () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ name: '' }}
				validate={{ name: (value) => (value.length === 0 ? 'required' : undefined) }}
			>
				<SubmitButton>Save</SubmitButton>
			</Form>,
		)

		const button = container.querySelector('button')

		expect(button).not.toBeDisabled()
	})

	it('respects an explicit `disabled` prop', () => {
		const { container } = renderUI(
			<Form defaultValues={{ name: 'Ada' }}>
				<SubmitButton disabled>Save</SubmitButton>
			</Form>,
		)

		const button = container.querySelector('button')

		expect(button).toBeDisabled()
	})

	it('disables while the form is submitting', async () => {
		let resolveSubmit: (() => void) | undefined

		const { container } = renderUI(
			<Form
				defaultValues={{ name: 'Ada' }}
				onSubmit={() =>
					new Promise<void>((resolve) => {
						resolveSubmit = resolve
					})
				}
			>
				<SubmitButton>Save</SubmitButton>
			</Form>,
		)

		const form = bySlot(container, 'form') as HTMLFormElement

		await act(async () => {
			fireEvent.submit(form)
		})

		expect(screen.getByRole('button')).toBeDisabled()

		await act(async () => {
			resolveSubmit?.()
		})

		await waitFor(() => {
			expect(screen.getByRole('button')).not.toBeDisabled()
		})
	})

	it('forwards children to the inner Button', () => {
		renderUI(
			<Form defaultValues={{ name: 'Ada' }}>
				<SubmitButton>Send it</SubmitButton>
			</Form>,
		)

		expect(screen.getByRole('button', { name: 'Send it' })).toBeInTheDocument()
	})
})
