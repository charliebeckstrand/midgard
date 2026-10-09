import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { DensityProvider } from '../../../providers/density'
import { getSlot, present, renderUI } from '../../helpers'

/**
 * The text, the cell padding, and the row pitch of a DescriptionList take the
 * step of the nearest density scope. Before, they kept one size at each step
 * (V49). At `snug` (`md`) the values are the values from before the change.
 * `skeleton-parity.test.tsx` holds the skeleton to the list at each step.
 */

// The wide layout of a horizontal list starts at the `sm` breakpoint.
beforeAll(() => page.viewport(1024, 768))

type Density = 'compact' | 'snug' | 'loose'

const EXPECTED = {
	compact: { text: 12, pitch: 32, padding: 6, termGap: 12, detailsGap: 2 },
	snug: { text: 14, pitch: 38, padding: 8, termGap: 16, detailsGap: 4 },
	loose: { text: 16, pitch: 44, padding: 10, termGap: 20, detailsGap: 6 },
} as const

const list = (orientation: 'horizontal' | 'vertical') => (
	<DescriptionList orientation={orientation}>
		<DescriptionTerm>Name</DescriptionTerm>
		<DescriptionDetails>Wade Cooper</DescriptionDetails>
		<DescriptionTerm>Email</DescriptionTerm>
		<DescriptionDetails>wade@example.com</DescriptionDetails>
		<DescriptionTerm>Role</DescriptionTerm>
		<DescriptionDetails>Admin</DescriptionDetails>
	</DescriptionList>
)

function measure(density: Density) {
	const horizontal = getSlot(
		renderUI(<DensityProvider density={density}>{list('horizontal')}</DensityProvider>).container,
		'dl',
	)

	const vertical = getSlot(
		renderUI(<DensityProvider density={density}>{list('vertical')}</DensityProvider>).container,
		'dl',
	)

	// The first row has no top padding, so the pitch is from the second row to the third.
	const [, second, third] = horizontal.querySelectorAll('dt')

	const term = getComputedStyle(present(second, 'the second term'))

	const px = (value: string) => Number.parseFloat(value)

	return {
		text: px(term.fontSize),
		pitch:
			present(third, 'the third term').getBoundingClientRect().top -
			present(second, 'the second term').getBoundingClientRect().top,
		padding: px(term.paddingTop),
		termGap: px(getComputedStyle(present(vertical.querySelectorAll('dt')[1], 'a term')).paddingTop),
		detailsGap: px(getComputedStyle(present(vertical.querySelector('dd'), 'a cell')).paddingTop),
	}
}

describe('DescriptionList density', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the text and the rows at the step of a %s provider',
		(density) => {
			expect(measure(density)).toEqual(EXPECTED[density])
		},
	)
})
