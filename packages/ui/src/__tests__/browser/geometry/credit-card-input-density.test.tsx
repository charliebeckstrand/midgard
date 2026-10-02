import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { CreditCardInput } from '../../../components/credit-card-input'
import { DensityProvider } from '../../../providers/density'
import { getSlot, present, renderUI } from '../../helpers'

/**
 * The brand text in the suffix of a CreditCardInput takes the text step of the
 * control, as the typed number does. Before, the brand text kept the `text-base`
 * size of the page at each step (V18). At `snug` (`md`) the values are the
 * values from before the change.
 */

type Density = 'compact' | 'snug' | 'loose'

const EXPECTED = {
	compact: { text: 14, brand: 14 },
	snug: { text: 16, brand: 16 },
	loose: { text: 18, brand: 18 },
} as const

function measure(node: ReactElement) {
	const { container } = renderUI(node)

	const input = present(container.querySelector('input'), 'the input')

	const suffix = getSlot(container, 'suffix')

	expect(suffix.textContent).toBe('Visa')

	return {
		text: Number.parseFloat(getComputedStyle(input).fontSize),
		brand: Number.parseFloat(getComputedStyle(suffix).fontSize),
	}
}

describe('CreditCardInput density', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the brand text at the text step of the control at a %s provider',
		(density: Density) => {
			expect(
				measure(
					<DensityProvider density={density}>
						<CreditCardInput aria-label="Card number" defaultValue="4242 4242 4242 4242" />
					</DensityProvider>,
				),
			).toEqual(EXPECTED[density])
		},
	)

	it('sizes the brand text at the step of an explicit size', () => {
		expect(
			measure(
				<DensityProvider density="loose">
					<CreditCardInput size="sm" aria-label="Card number" defaultValue="4242 4242 4242 4242" />
				</DensityProvider>,
			),
		).toEqual(EXPECTED.compact)
	})
})
