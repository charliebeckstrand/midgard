import { describe, expect, it } from 'vitest'
import { PasswordInput } from '../../components/password-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('PasswordInput', () => {
	it('renders an input with type password by default', () => {
		const { container } = renderUI(<PasswordInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'password')
	})

	it('toggles input type when visibility button is clicked', async () => {
		const { container } = renderUI(<PasswordInput />)

		const user = userEvent.setup()

		const toggle = screen.getByLabelText('Show password')

		await user.click(toggle)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('type', 'text')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<PasswordInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<PasswordInput placeholder="Enter password" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'Enter password')
	})
})
