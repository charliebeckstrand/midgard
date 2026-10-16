import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { DensityProvider } from '../../../providers/density'
import { getSlot, renderUI } from '../../helpers'

/**
 * Below the `sm` breakpoint a horizontal DescriptionList stacks each term above
 * its details. There it has the spacing of a vertical list at each density
 * step, so the two orientations look the same on a phone. Before, the stacked
 * horizontal list had no gap from a term to its details and kept a bottom
 * padding under its last details.
 */

beforeAll(() => page.viewport(390, 844))

type Orientation = 'horizontal' | 'vertical'

function layout(orientation: Orientation, density: 'compact' | 'snug' | 'loose') {
	const list = getSlot(
		renderUI(
			<DensityProvider density={density}>
				<DescriptionList orientation={orientation}>
					<DescriptionTerm>Name</DescriptionTerm>
					<DescriptionDetails>Wade Cooper</DescriptionDetails>
					<DescriptionTerm>Email</DescriptionTerm>
					<DescriptionDetails>wade@example.com</DescriptionDetails>
					<DescriptionTerm>Role</DescriptionTerm>
					<DescriptionDetails>Admin</DescriptionDetails>
				</DescriptionList>
			</DensityProvider>,
		).container,
		'dl',
	)

	const box = list.getBoundingClientRect()

	// The text, not the box: the padding of a cell sits inside its box.
	const cells = [...list.children].map((cell) => {
		const range = document.createRange()

		range.selectNodeContents(cell)

		const rect = range.getBoundingClientRect()

		return { top: rect.top - box.top, left: rect.left - box.left }
	})

	return { height: box.height, cells }
}

describe('DescriptionList orientation parity at a phone width', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'places each cell of both orientations at one offset at the %s step',
		(density) => {
			expect(layout('horizontal', density)).toEqual(layout('vertical', density))
		},
	)
})
