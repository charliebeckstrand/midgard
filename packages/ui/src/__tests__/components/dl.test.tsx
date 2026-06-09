import { describe, expect, it } from 'vitest'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../components/dl'
import { bySlot, expectSlot, renderUI } from '../helpers'

describe('DescriptionList', () => {
	it('renders with data-slot="dl"', () => {
		const { container } = renderUI(<DescriptionList>content</DescriptionList>)

		expectSlot(container, 'dl', 'dl')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<DescriptionList id="test">content</DescriptionList>)

		const el = bySlot(container, 'dl')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('DescriptionTerm', () => {
	it('renders with data-slot="dl-term"', () => {
		const { container } = renderUI(<DescriptionTerm>Term</DescriptionTerm>)

		expectSlot(container, 'dl-term', 'dt')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<DescriptionTerm id="test">Term</DescriptionTerm>)

		const el = bySlot(container, 'dl-term')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('DescriptionDetails', () => {
	it('renders with data-slot="dl-details"', () => {
		const { container } = renderUI(<DescriptionDetails>Value</DescriptionDetails>)

		expectSlot(container, 'dl-details', 'dd')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<DescriptionDetails id="test">Value</DescriptionDetails>)

		const el = bySlot(container, 'dl-details')

		expect(el).toHaveAttribute('id', 'test')
	})
})
