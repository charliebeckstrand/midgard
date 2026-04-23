import { describe, expect, it, vi } from 'vitest'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { deriveStatus } from '../../components/password-confirm/utilities'
import { PasswordInput } from '../../components/password-input'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('PasswordConfirm', () => {
	it('renders with data-slot="password-confirm"', () => {
		const { container } = renderUI(<PasswordConfirm>content</PasswordConfirm>)

		const el = bySlot(container, 'password-confirm')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<PasswordConfirm>Hello</PasswordConfirm>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<PasswordConfirm className="custom">content</PasswordConfirm>)

		const el = bySlot(container, 'password-confirm')

		expect(el?.className).toContain('custom')
	})
})

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

describe('deriveStatus', () => {
	it('returns idle when the password field is empty', () => {
		expect(deriveStatus('', 'abc', 'password')).toBe('idle')
	})

	it('returns idle when the confirm field is empty', () => {
		expect(deriveStatus('abc', '', 'confirm')).toBe('idle')
	})

	it('returns idle when passwords match', () => {
		expect(deriveStatus('abc', 'abc', 'confirm')).toBe('idle')
	})

	it('returns idle while the user is still typing the confirm value', () => {
		expect(deriveStatus('abcdef', 'abc', 'confirm')).toBe('idle')
	})

	it('returns warning when passwords differ and the password was last edited', () => {
		expect(deriveStatus('abc', 'abd', 'password')).toBe('warning')
	})

	it('returns warning when the confirm value is longer than the password and differs', () => {
		expect(deriveStatus('abc', 'abcd', 'confirm')).toBe('warning')
	})
})
