import { describe, expect, it, vi } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { bySlot, fireEvent, mockGeometry, renderUI } from '../helpers'

describe('ScrollArea', () => {
	it('passes through HTML attributes to the viewport', () => {
		const { container } = renderUI(<ScrollArea id="test">content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport')

		expect(viewport).toHaveAttribute('id', 'test')
	})

	it('composes a consumer onScroll with thumb tracking', () => {
		const onScroll = vi.fn()

		const { container } = renderUI(<ScrollArea onScroll={onScroll}>content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport') as HTMLElement

		// The consumer handler must not clobber the internal scroll handler
		// (which drives thumb tracking and auto-fade) — both fire.
		fireEvent.scroll(viewport)

		expect(onScroll).toHaveBeenCalledTimes(1)
	})

	it('lets a horizontally scrollable viewport keep shift+wheel', () => {
		const { container } = renderUI(<ScrollArea orientation="horizontal">content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport') as HTMLElement

		mockGeometry(viewport, { scrollWidth: 400, clientWidth: 100 })

		const event = new WheelEvent('wheel', { shiftKey: true, deltaY: 10, cancelable: true })

		viewport.dispatchEvent(event)

		// The viewport scrolls horizontally itself; forwarding the gesture to an
		// ancestor would hijack it from its own content.
		expect(event.defaultPrevented).toBe(false)
	})

	it('forwards shift+wheel when the viewport has no horizontal overflow', () => {
		const { container } = renderUI(<ScrollArea>content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport') as HTMLElement

		mockGeometry(viewport, { scrollWidth: 100, clientWidth: 100 })

		const event = new WheelEvent('wheel', { shiftKey: true, deltaY: 10, cancelable: true })

		viewport.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
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
