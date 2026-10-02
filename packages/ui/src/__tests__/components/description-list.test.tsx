import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
	DescriptionDetails,
	DescriptionList,
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
