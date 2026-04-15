import { describe, expect, it } from 'vitest'
import { PasswordConfirm } from '../../components/password-confirm'
import { bySlot, renderUI, screen } from '../helpers'

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
