import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { bySlot, fireEvent, getSlot, renderUI } from '../helpers'

/**
 * The ScrollArea's structural and event-wiring contract. Its two overflow
 * decisions — whether shift+wheel is kept or forwarded — read `scrollWidth`
 * against `clientWidth`, which jsdom reports as zero, so they moved to
 * `browser/scroll-area-wheel.test.tsx` where the content really overflows.
 */
describe('ScrollArea', () => {
	it('composes a consumer onScroll with thumb tracking', () => {
		const onScroll = vi.fn()

		const { container } = renderUI(<ScrollArea onScroll={onScroll}>content</ScrollArea>)

		const viewport = getSlot(container, 'scroll-area-viewport')

		// The consumer handler must not clobber the internal scroll handler
		// (which drives thumb tracking and auto-fade); both fire.
		fireEvent.scroll(viewport)

		expect(onScroll).toHaveBeenCalledTimes(1)
	})

	// Thumb tracking is state that follows an event the browser cannot cancel,
	// so a consumer `preventDefault()` does not skip it (CONVENTIONS.md §3.9).
	it('shows the auto scrollbar when a consumer onScroll prevents the default', () => {
		const { container } = renderUI(
			<ScrollArea onScroll={(event) => event.preventDefault()}>content</ScrollArea>,
		)

		const scrollbar = getSlot(container, 'scroll-area-scrollbar')

		expect(scrollbar).toHaveClass('opacity-0')

		fireEvent.scroll(getSlot(container, 'scroll-area-viewport'))

		expect(scrollbar).toHaveClass('opacity-100')
	})

	it('forwards a consumer ref without losing thumb tracking', () => {
		// Content four times the viewport, so the measured thumb shows.
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(400)

		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)

		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(<ScrollArea ref={ref}>content</ScrollArea>)

		expect(ref.current).toBe(getSlot(container, 'scroll-area-viewport'))

		expect(bySlot(container, 'scroll-area-thumb')).toBeInTheDocument()
	})

	it('does not render scrollbar elements when scrollbar is hidden', () => {
		const { container } = renderUI(
			<ScrollArea scrollbar="hidden" orientation="both">
				content
			</ScrollArea>,
		)

		expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeNull()
	})

	it('reflects orientation="horizontal" on the viewport overflow axes', () => {
		const { container } = renderUI(<ScrollArea orientation="horizontal">content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport')

		// The viewport recipe encodes orientation; horizontal scrolls X and clamps Y.
		// Vertical (overflow-x-hidden overflow-y-auto) and both (overflow-auto) lack
		// this exact pair, so this would fail for any other orientation.
		expect(viewport).toHaveClass('overflow-x-auto', 'overflow-y-hidden')
	})

	it('reflects orientation="both" on the viewport overflow axes', () => {
		const { container } = renderUI(<ScrollArea orientation="both">content</ScrollArea>)

		const viewport = bySlot(container, 'scroll-area-viewport')

		// Both scrolls on every axis (size-full overflow-auto); neither vertical nor
		// horizontal emits overflow-auto, so this would fail for any other orientation.
		expect(viewport).toHaveClass('size-full', 'overflow-auto')
	})

	it('uses scrollbar="visible" to keep the scrollbar in the active state', () => {
		const { container } = renderUI(<ScrollArea scrollbar="visible">content</ScrollArea>)

		const scrollbar = bySlot(container, 'scroll-area-scrollbar')

		// visible pins the scrollbar to its active state (opacity-100); auto would be
		// opacity-0 group-hover:opacity-100 and hidden renders no scrollbar element.
		expect(scrollbar).toHaveClass('opacity-100')

		expect(scrollbar).not.toHaveClass('opacity-0')
	})
})
