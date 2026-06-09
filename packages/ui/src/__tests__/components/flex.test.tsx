import { describe, expect, it } from 'vitest'
import { Flex } from '../../components/flex'
import { bySlot, renderUI } from '../helpers'

describe('Flex', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Flex id="test">content</Flex>)

		const el = bySlot(container, 'flex')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('centres children on the cross axis by default for rows', () => {
		const { container } = renderUI(<Flex>content</Flex>)

		expect(bySlot(container, 'flex')).toHaveClass('items-center')
	})

	it('stretches children across the inline axis when the direction is a column', () => {
		const { container } = renderUI(<Flex direction="col">content</Flex>)

		expect(bySlot(container, 'flex')).toHaveClass('items-stretch')
	})
})
