import { describe, expect, it, vi } from 'vitest'
import { Description, Field, Label } from '../../components/fieldset'
import { PasswordInput } from '../../components/password-input'
import { defaultPasswordRules, PasswordStrength } from '../../components/password-strength'
import { allBySlot, renderUI, screen } from '../helpers'

describe('PasswordStrength', () => {
	it('renders four meter segments', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		expect(allBySlot(container, 'password-strength-segment')).toHaveLength(4)
	})

	it('exposes the gauge as a meter whose value text is the level', () => {
		renderUI(<PasswordStrength value="Abcdefg1" />)

		const meter = screen.getByRole('meter', { name: 'Password strength' })

		expect(meter).toHaveAttribute('value', '3')

		expect(meter).toHaveAttribute('aria-valuetext', 'Good')

		expect(screen.queryByRole('progressbar')).toBeNull()
	})

	it('renders one rule per default rule', () => {
		const { container } = renderUI(<PasswordStrength value="" />)

		expect(allBySlot(container, 'password-strength-rule')).toHaveLength(defaultPasswordRules.length)
	})

	it('marks passing rules with data-passed', () => {
		const { container } = renderUI(<PasswordStrength value="Abcdefg1" />)

		const passed = allBySlot(container, 'password-strength-rule').filter((el) =>
			el.hasAttribute('data-passed'),
		)

		// length 8+, has uppercase, has number: 3 rules pass, symbol does not
		expect(passed).toHaveLength(3)
	})

	it.for([
		// All four default rules pass.
		{ name: 'activates meter segments based on strength', value: 'Abcdefgh1!', count: 4 },
		{ name: 'shows no active segments when value is empty', value: '', count: 0 },
	])('$name', ({ value, count }) => {
		const { container } = renderUI(<PasswordStrength value={value} />)

		const active = allBySlot(container, 'password-strength-segment').filter((el) =>
			el.hasAttribute('data-active'),
		)

		expect(active).toHaveLength(count)
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

	it('names the subject in the live region and shows only the level', () => {
		renderUI(<PasswordStrength value="Abcdefg1" />)

		const region = screen.getByRole('status')

		expect(region).toHaveAttribute('aria-atomic', 'true')

		// A screen reader reads the whole region, so the level has a subject when
		// the user hears it alone (WCAG 4.1.3).
		expect(region.querySelector('.sr-only')).toHaveTextContent('Password strength: Good')

		// The visible text is only the level word, and it is hidden from the
		// accessibility tree, so the region does not read the level two times.
		const visible = region.querySelector('[aria-hidden="true"]')

		expect(visible).toHaveTextContent(/^Good$/)
	})

	describe('in a Field', () => {
		// The rules are the instructions of the password, so a reader in forms
		// mode hears them on the field and does not have to leave it to find them
		// (WCAG 3.3.2, 1.3.1).
		it('describes the password field by the rules and their state', () => {
			renderUI(
				<Field>
					<Label>Password</Label>
					<PasswordInput defaultValue="" />
					<PasswordStrength value="Abcdefg1" />
				</Field>,
			)

			expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
				'At least 8 characters, met One uppercase letter, met One number, met One symbol, not met',
			)
		})

		it('keeps the Description of the field before the rules', () => {
			renderUI(
				<Field>
					<Label>Password</Label>
					<Description>Use a password manager.</Description>
					<PasswordInput defaultValue="" />
					<PasswordStrength value="" />
				</Field>,
			)

			expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
				/^Use a password manager\. At least 8 characters, not met/,
			)
		})

		it('adds no description when the rules do not show', () => {
			renderUI(
				<Field>
					<Label>Password</Label>
					<PasswordInput defaultValue="" />
					<PasswordStrength value="" showRules={false} />
				</Field>,
			)

			expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-describedby')
		})
	})
})
