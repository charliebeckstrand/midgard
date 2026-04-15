import { describe, expect, it } from 'vitest'
import { Flex } from '../../components/flex'
import { bySlot, renderUI, screen } from '../helpers'

describe('Flex', () => {
	it('renders with data-slot="flex"', () => {
		const { container } = renderUI(<Flex>content</Flex>)

		const el = bySlot(container, 'flex')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Flex>Hello</Flex>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Flex className="custom">content</Flex>)

		const el = bySlot(container, 'flex')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Flex id="test">content</Flex>)

		const el = bySlot(container, 'flex')

		expect(el).toHaveAttribute('id', 'test')
	})
})
