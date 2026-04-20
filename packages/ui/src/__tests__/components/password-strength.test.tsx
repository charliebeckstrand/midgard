import { describe, expect, it, vi } from 'vitest'
import { defaultPasswordRules, PasswordStrength } from '../../components/password-strength'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

describe('PasswordStrength', () => {
	it('renders with data-slot="password-strength"', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		const el = bySlot(container, 'password-strength')

		expect(el).toBeInTheDocument()
	})

	it('renders four meter segments', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		expect(allBySlot(container, 'password-strength-segment')).toHaveLength(4)
	})

	it('renders one rule per default rule', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		expect(allBySlot(container, 'password-strength-rule')).toHaveLength(defaultPasswordRules.length)
	})

	it('marks passing rules with data-passed', () => {
		const { container } = renderUI(<PasswordStrength value="Abcdefg1" />)

		const passed = container.querySelectorAll('[data-slot="password-strength-rule"][data-passed]')

		// length 8+, has uppercase, has number — 3 rules pass, symbol does not
		expect(passed).toHaveLength(3)
	})

	it('activates meter segments based on strength', () => {
		const { container } = renderUI(<PasswordStrength value="Abcdefgh1!" />)

		const active = container.querySelectorAll(
			'[data-slot="password-strength-segment"][data-active]',
		)

		// all 4 default rules pass
		expect(active).toHaveLength(4)
	})

	it('shows no active segments when value is empty', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		const active = container.querySelectorAll(
			'[data-slot="password-strength-segment"][data-active]',
		)

		expect(active).toHaveLength(0)
	})

	it('hides the rules list when showRules is false', () => {
		const { container } = renderUI(<PasswordStrength value="abc" showRules={false} />)

		expect(allBySlot(container, 'password-strength-rule')).toHaveLength(0)
	})

	it('calls onStrengthChange with the score and passed rule ids', () => {
		const onStrengthChange = vi.fn()

		renderUI(<PasswordStrength value="Abcdefgh1!" onStrengthChange={onStrengthChange} />)

		expect(onStrengthChange).toHaveBeenCalledWith(
			expect.objectContaining({
				score: 4,
				max: 4,
				level: 'strong',
				passed: ['length', 'uppercase', 'number', 'symbol'],
			}),
		)
	})

	it('renders the Weak label for a short all-lowercase password', () => {
		renderUI(<PasswordStrength value="abc" />)

		expect(screen.getByText('Weak')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<PasswordStrength value="" className="custom" />)

		const el = bySlot(container, 'password-strength')

		expect(el?.className).toContain('custom')
	})
})
