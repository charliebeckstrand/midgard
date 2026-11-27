import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { type DensityLevel, DensityProvider, densityLevels } from '../../../providers/density'
import type { Orientation } from '../../../types/orientation'
import { getSlot, renderUI } from '../../helpers'

/**
 * By default a DescriptionList is vertical below the `sm` breakpoint and
 * horizontal from it. At each width and density step it has the layout of the
 * list with that orientation, cell for cell. Before, the default stacked its
 * horizontal rows on a phone with the row padding, so it had no gap from a term
 * to its details and a bottom padding under its last details.
 */

const levels = densityLevels.map(({ value }) => value)

function layout(orientation: Orientation | undefined, density: DensityLevel) {
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

describe('DescriptionList default orientation at a phone width', () => {
	beforeAll(() => page.viewport(390, 844))

	it.each(levels)('is the vertical layout at the %s step', (density) => {
		expect(layout(undefined, density)).toEqual(layout('vertical', density))
	})
})

describe('DescriptionList default orientation at `sm` and up', () => {
	beforeAll(() => page.viewport(1024, 768))

	it.each(levels)('is the horizontal layout at the %s step', (density) => {
		expect(layout(undefined, density)).toEqual(layout('horizontal', density))
	})

	it.each(levels)('puts each details beside its term at the %s step', (density) => {
		const { cells } = layout('horizontal', density)

		const terms = cells.filter((_, index) => index % 2 === 0).map(({ top }) => top)

		const details = cells.filter((_, index) => index % 2 === 1).map(({ top }) => top)

		expect(details).toEqual(terms)
	})
})
