import { describe, expect, it } from 'vitest'
import { Text } from '../../components/text'
import { bySlot, itRendersSkeletonPlaceholder, renderUI } from '../helpers'

describe('Text', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Text id="intro">Intro</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('id', 'intro')
	})

	itRendersSkeletonPlaceholder(<Text>Hello</Text>, 'text')
})
