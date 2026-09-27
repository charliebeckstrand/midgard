import cardValidator from 'card-validator'
import { describe, expect, it, vi } from 'vitest'
import { CreditCardInput } from '../../components/credit-card-input'
import { getSlot, renderUI, userEvent } from '../helpers'

/**
 * A keystroke in CreditCardInput runs the card-number check one time.
 *
 * The keystroke formats the number, detects the brand, validates the number,
 * and renders the brand label. Each step ran the check again, four times in
 * all. A cache of one entry now serves all four steps.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('card-validator', async (importOriginal) => {
	const actual = (await importOriginal<{ default: typeof cardValidator }>()).default

	return { default: { ...actual, number: vi.fn(actual.number) } }
})

describe('CreditCardInput card-number check', () => {
	it('runs one time per keystroke', async () => {
		const check = vi.mocked(cardValidator.number)

		const { container } = renderUI(
			<CreditCardInput onBrandChange={() => {}} onValidityChange={() => {}} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = userEvent.setup({ delay: null })

		check.mockClear()

		await user.type(input, '4242')

		expect(check).toHaveBeenCalledTimes(4)
	})
})
