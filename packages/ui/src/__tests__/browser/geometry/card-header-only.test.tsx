import { describe, expect, it } from 'vitest'
import { Card, CardHeader, CardTitle } from '../../../components/card'
import { DensityProvider } from '../../../providers/density'
import { getSlot, renderUI } from '../../helpers'

/**
 * A header pads only the edge that it shares with the body. A card that holds
 * only a header has no body, so the space under the title must equal the space
 * over it.
 */
describe('Card with only a header', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'puts the title in the middle of the card at %s density',
		(density) => {
			const { container } = renderUI(
				<DensityProvider density={density}>
					<Card outline className="w-80">
						<CardHeader>
							<CardTitle>Billing</CardTitle>
						</CardHeader>
					</Card>
				</DensityProvider>,
			)

			const card = getSlot(container, 'card').getBoundingClientRect()

			const title = getSlot(container, 'card-title').getBoundingClientRect()

			expect(card.bottom - title.bottom).toBe(title.top - card.top)
		},
	)
})
