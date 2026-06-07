import { describe, expect, it, vi } from 'vitest'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { PasswordInput } from '../../components/password-input'
import { fireEvent, renderUI, screen } from '../helpers'

describe('PasswordConfirmInput', () => {
	it('calls onChange when the input changes', () => {
		const onChange = vi.fn()

		renderUI(
			<PasswordConfirm>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" onChange={onChange} />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		const confirmInput = inputs[1] as HTMLInputElement

		fireEvent.change(confirmInput, { target: { value: 'secret' } })

		expect(onChange).toHaveBeenCalled()
	})

	it('applies data-warning when passwords differ and the confirm was last edited', () => {
		renderUI(
			<PasswordConfirm>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		const passwordInput = inputs[0] as HTMLInputElement

		const confirmInput = inputs[1] as HTMLInputElement

		fireEvent.input(passwordInput, { target: { value: 'abc' } })

		fireEvent.change(confirmInput, { target: { value: 'abcd' } })

		expect(confirmInput).toHaveAttribute('data-warning')
	})
})

describe('PasswordConfirm warning rendering', () => {
	it('renders the warning when passwords mismatch and a warning node is provided', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		fireEvent.input(inputs[0] as HTMLInputElement, { target: { value: 'abc' } })

		fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'abcd' } })

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
	})

	it('calls onPasswordMatch when passwords match', () => {
		const onPasswordMatch = vi.fn()

		renderUI(
			<PasswordConfirm onPasswordMatch={onPasswordMatch}>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		fireEvent.input(inputs[0] as HTMLInputElement, { target: { value: 'abc' } })

		fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'abc' } })

		expect(onPasswordMatch).toHaveBeenCalled()
	})

	it('calls onPasswordMismatch when passwords diverge', () => {
		const onPasswordMismatch = vi.fn()

		renderUI(
			<PasswordConfirm onPasswordMismatch={onPasswordMismatch}>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		fireEvent.input(inputs[0] as HTMLInputElement, { target: { value: 'abc' } })

		fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'abd' } })

		expect(onPasswordMismatch).toHaveBeenCalled()
	})
})
