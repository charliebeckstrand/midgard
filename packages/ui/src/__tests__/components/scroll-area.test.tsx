import { describe, expect, it } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { bySlot, renderUI, screen } from '../helpers'

describe('ScrollArea', () => {
	it('renders with data-slot="scroll-area"', () => {
		const { container } = renderUI(<ScrollArea>content</ScrollArea>)

		const el = bySlot(container, 'scroll-area')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<ScrollArea>Hello</ScrollArea>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ScrollArea className="custom">content</ScrollArea>)

		const el = bySlot(container, 'scroll-area')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes to the viewport', () => {
		const { container } = renderUI(<ScrollArea id="test">content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport')

		expect(viewport).toHaveAttribute('id', 'test')
	})
})
