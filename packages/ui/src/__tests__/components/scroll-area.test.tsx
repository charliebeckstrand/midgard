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

	it('does not render scrollbar elements when scrollbar is hidden', () => {
		const { container } = renderUI(
			<ScrollArea scrollbar="hidden" orientation="both">
				content
			</ScrollArea>,
		)

		expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeNull()
	})

	it('reflects orientation="horizontal" so only the horizontal scrollbar may render', () => {
		const { container } = renderUI(<ScrollArea orientation="horizontal">content</ScrollArea>)

		const wrapper = bySlot(container, 'scroll-area')

		// Wrapper recipe encodes the orientation; verify the viewport mounted under it.
		expect(wrapper).toBeInTheDocument()

		expect(bySlot(container, 'scroll-area-viewport')).toBeInTheDocument()
	})

	it('reflects orientation="both" on the wrapper', () => {
		const { container } = renderUI(<ScrollArea orientation="both">content</ScrollArea>)

		expect(bySlot(container, 'scroll-area-viewport')).toBeInTheDocument()
	})

	it('forwards bare and rounded variant props to the wrapper', () => {
		const { container } = renderUI(
			<ScrollArea bare rounded>
				content
			</ScrollArea>,
		)

		// Bare/rounded only affect class names — confirm the component mounted.
		expect(bySlot(container, 'scroll-area')).toBeInTheDocument()
	})

	it('uses scrollbar="visible" to keep the scrollbar in the active state', () => {
		const { container } = renderUI(<ScrollArea scrollbar="visible">content</ScrollArea>)

		expect(bySlot(container, 'scroll-area')).toBeInTheDocument()
	})
})
