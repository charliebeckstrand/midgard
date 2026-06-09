import { describe, expect, it } from 'vitest'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../components/dl'
import { bySlot, renderUI } from '../helpers'

describe('DescriptionList', () => {
	it('renders with data-slot="dl"', () => {
		const { container } = renderUI(<DescriptionList>content</DescriptionList>)

		const el = bySlot(container, 'dl')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DL')
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

		const el = bySlot(container, 'dl-term')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DT')
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

		const el = bySlot(container, 'dl-details')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DD')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<DescriptionDetails id="test">Value</DescriptionDetails>)

		const el = bySlot(container, 'dl-details')

		expect(el).toHaveAttribute('id', 'test')
	})
})
