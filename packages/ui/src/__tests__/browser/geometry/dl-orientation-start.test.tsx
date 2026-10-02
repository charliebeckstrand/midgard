import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../../components/dl'
import { getSlot, present, renderUI } from '../../helpers'

/**
 * A DescriptionList starts its first term at its top edge in each orientation.
 * Two lists side by side then start their first rows at one height. A row of a
 * horizontal list pads its top for the row above it, and the first row has no
 * row above it.
 */
function firstRowOffset(orientation: 'horizontal' | 'vertical') {
	const { container } = renderUI(
		<DescriptionList orientation={orientation}>
			<DescriptionTerm>Name</DescriptionTerm>
			<DescriptionDetails>Ada Lovelace</DescriptionDetails>
			<DescriptionTerm>Role</DescriptionTerm>
			<DescriptionDetails>Engineer</DescriptionDetails>
		</DescriptionList>,
	)

	const list = getSlot(container, 'dl')

	const top = list.getBoundingClientRect().top

	// The text, not the box: the padding of a cell sits inside its box.
	const [term, details] = [list.querySelector('dt'), list.querySelector('dd')].map((el) => {
		const range = document.createRange()

		range.selectNodeContents(present(el, 'a cell'))

		return range.getBoundingClientRect().top - top
	})

	return { term, details }
}

describe('DescriptionList start offset at a phone width', () => {
	beforeAll(() => page.viewport(414, 896))

	it('starts the first term of each orientation at one height', () => {
		expect(firstRowOffset('horizontal').term).toBe(firstRowOffset('vertical').term)
	})
})

describe('DescriptionList start offset at `sm` and up', () => {
	beforeAll(() => page.viewport(1024, 768))

	it('starts the first term of each orientation at one height', () => {
		expect(firstRowOffset('horizontal').term).toBe(firstRowOffset('vertical').term)
	})

	it('starts the first details of a horizontal list beside the first term', () => {
		const { term, details } = firstRowOffset('horizontal')

		expect(details).toBe(term)
	})
})
