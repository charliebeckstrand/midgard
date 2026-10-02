import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionListSkeleton,
	DescriptionTerm,
} from '../../components/description-list'
import { getSlot, renderUI } from '../helpers'

describe('DescriptionList', () => {
	it.each<[string, string, ReactElement]>([
		['dl', 'DL', <DescriptionList key="dl">content</DescriptionList>],
		['dl-term', 'DT', <DescriptionTerm key="dt">Term</DescriptionTerm>],
		['dl-details', 'DD', <DescriptionDetails key="dd">Value</DescriptionDetails>],
	])('renders data-slot="%s" as a %s element', (slot, tag, ui) => {
		const { container } = renderUI(ui)

		expect(getSlot(container, slot).tagName).toBe(tag)
	})
})

describe('DescriptionListSkeleton', () => {
	it('hides its list from assistive technology, so no empty terms are read', () => {
		const { container } = renderUI(<DescriptionListSkeleton rows={2} />)

		const wrapper = container.firstElementChild

		expect(wrapper).toHaveAttribute('aria-hidden', 'true')

		const root = wrapper?.firstElementChild

		expect(root?.tagName).toBe('DL')

		expect(root?.querySelectorAll(':scope > dt')).toHaveLength(2)

		expect(root?.querySelectorAll(':scope > dd')).toHaveLength(2)
	})
})
