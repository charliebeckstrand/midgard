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

	it('describes the confirm input by the warning while the mismatch holds', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		const passwordInput = inputs[0] as HTMLInputElement

		const confirmInput = inputs[1] as HTMLInputElement

		fireEvent.input(passwordInput, { target: { value: 'abc' } })

		fireEvent.change(confirmInput, { target: { value: 'abcd' } })

		// The warning id joins the input's aria-describedby, so focusing the
		// invalid field announces the reason, not a bare "invalid".
		const describedBy = confirmInput.getAttribute('aria-describedby')

		expect(describedBy).toBeTruthy()

		const warning = document.getElementById((describedBy as string).split(' ').at(-1) as string)

		expect(warning).toHaveTextContent('Passwords do not match')

		// Matching again drops both the warning and the reference.
		fireEvent.change(confirmInput, { target: { value: 'abc' } })

		expect(confirmInput).not.toHaveAttribute('aria-describedby')
	})

	it('resets the coordinator when the confirm input unmounts', () => {
		const { rerender } = renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

		fireEvent.input(inputs[0] as HTMLInputElement, { target: { value: 'abc' } })

		fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'abcd' } })

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		// Unmounting the confirm field clears the stale confirm value/name;
		// the warning must not keep reporting a mismatch against nothing.
		rerender(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
			</PasswordConfirm>,
		)

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
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
