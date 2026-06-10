import { describe, expect, it } from 'vitest'
import { Control } from '../../components/control'
import { PasswordInput } from '../../components/password-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('PasswordInput', () => {
	it('renders an input with type password by default', () => {
		const { container } = renderUI(<PasswordInput />)

		const input = bySlot(container, 'password-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'password')
	})

	it('toggles input type when visibility button is clicked', async () => {
		const { container } = renderUI(<PasswordInput />)

		const user = userEvent.setup()

		const toggle = screen.getByLabelText('Show password')

		await user.click(toggle)

		const input = bySlot(container, 'password-input')

		expect(input).toHaveAttribute('type', 'text')
	})

	it('exposes the toggle as a pressed-state button with a fixed name', async () => {
		renderUI(<PasswordInput />)

		const user = userEvent.setup()

		const toggle = screen.getByRole('button', { name: 'Show password' })

		// APG toggle pattern: aria-pressed conveys the state while the
		// accessible name stays fixed.
		expect(toggle).toHaveAttribute('aria-pressed', 'false')

		await user.click(toggle)

		expect(toggle).toHaveAttribute('aria-pressed', 'true')

		expect(toggle).toHaveAccessibleName('Show password')
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<PasswordInput placeholder="Enter password" />)

		const input = bySlot(container, 'password-input')

		expect(input).toHaveAttribute('placeholder', 'Enter password')
	})

	it('disables the toggle when the input is disabled', () => {
		renderUI(<PasswordInput disabled />)

		expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
	})

	it('disables the toggle when disabled comes from Control context', () => {
		renderUI(
			<Control disabled>
				<PasswordInput />
			</Control>,
		)

		expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
	})

	it('keeps the toggle enabled when the input is read-only', async () => {
		const { container } = renderUI(<PasswordInput readOnly />)

		const user = userEvent.setup()

		const toggle = screen.getByRole('button', { name: 'Show password' })

		expect(toggle).toBeEnabled()

		// readOnly means viewable-but-not-editable; revealing still works.
		await user.click(toggle)

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')
	})

	it('re-masks a revealed value while disabled and restores it on re-enable', async () => {
		const { container, rerender } = renderUI(<PasswordInput />)

		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Show password' }))

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')

		rerender(<PasswordInput disabled />)

		const input = bySlot(container, 'password-input')

		expect(input).toHaveAttribute('type', 'password')

		expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)

		rerender(<PasswordInput />)

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')
	})
})
