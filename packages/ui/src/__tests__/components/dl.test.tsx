import { describe, expect, it } from 'vitest'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../components/dl'
import { bySlot, renderUI, screen } from '../helpers'

describe('DescriptionList', () => {
	it('renders with data-slot="dl"', () => {
		const { container } = renderUI(<DescriptionList>content</DescriptionList>)

		const el = bySlot(container, 'dl')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DL')
	})

	it('renders children', () => {
		renderUI(<DescriptionList>content</DescriptionList>)

		expect(screen.getByText('content')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<DescriptionList className="custom">content</DescriptionList>)

		const el = bySlot(container, 'dl')

		expect(el?.className).toContain('custom')
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

	it('renders children', () => {
		renderUI(<DescriptionTerm>Label</DescriptionTerm>)

		expect(screen.getByText('Label')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<DescriptionTerm className="custom">Term</DescriptionTerm>)

		const el = bySlot(container, 'dl-term')

		expect(el?.className).toContain('custom')
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

	it('renders children', () => {
		renderUI(<DescriptionDetails>Detail</DescriptionDetails>)

		expect(screen.getByText('Detail')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<DescriptionDetails className="custom">Value</DescriptionDetails>,
		)

		const el = bySlot(container, 'dl-details')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<DescriptionDetails id="test">Value</DescriptionDetails>)

		const el = bySlot(container, 'dl-details')

		expect(el).toHaveAttribute('id', 'test')
	})
})
