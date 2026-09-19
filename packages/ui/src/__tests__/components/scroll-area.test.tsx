import { describe, expect, it, vi } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { bySlot, fireEvent, renderUI } from '../helpers'

/**
 * The ScrollArea's structural and event-wiring contract. Its two overflow
 * decisions — whether shift+wheel is kept or forwarded — read `scrollWidth`
 * against `clientWidth`, which jsdom reports as zero, so they moved to
 * `browser/scroll-area-wheel.test.tsx` where the content really overflows.
 */
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
		// (which drives thumb tracking and auto-fade); both fire.
		fireEvent.scroll(viewport)

		expect(onScroll).toHaveBeenCalledTimes(1)
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
