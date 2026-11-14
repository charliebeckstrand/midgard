import { describe, expect, it } from 'vitest'
import { Flex } from '../../structure/flex'
import { bySlot, getSlot, renderUI } from '../helpers'

describe('Flex', () => {
	it('centers children on the cross axis by default for rows', () => {
		const { container } = renderUI(<Flex>content</Flex>)

		expect(bySlot(container, 'flex')).toHaveClass('items-center')
	})

	it('stretches children across the inline axis when the direction is a column', () => {
		const { container } = renderUI(<Flex direction="col">content</Flex>)

		expect(bySlot(container, 'flex')).toHaveClass('items-stretch')
	})

	it('centers a row below the first breakpoint of a direction map with no initial value', () => {
		const { container } = renderUI(<Flex direction={{ md: 'col' }}>content</Flex>)

		const flex = getSlot(container, 'flex')

		expect(flex).toHaveClass('flex-row', 'items-center', 'md:flex-col', 'md:items-stretch')
	})

	it('renders a span for phrasing content', () => {
		const { container } = renderUI(
			<button type="button">
				<Flex as="span">content</Flex>
			</button>,
		)

		const flex = getSlot(container, 'flex')

		expect(flex.tagName).toBe('SPAN')

		expect(flex).toHaveClass('flex')
	})
})
