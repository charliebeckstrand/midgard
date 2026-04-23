import { describe, expect, it, vi } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import {
	computeThumb,
	findScrollableAncestor,
	HIDDEN_THUMB,
} from '../../components/scroll-area/utilities'
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

describe('computeThumb', () => {
	it('returns the hidden thumb when content fits within the viewport', () => {
		expect(computeThumb(0, 100, 80, 100)).toEqual(HIDDEN_THUMB)
	})

	it('returns the hidden thumb when the track has no size', () => {
		expect(computeThumb(0, 100, 200, 0)).toEqual(HIDDEN_THUMB)
	})

	it('computes a visible thumb proportional to the viewport ratio', () => {
		const thumb = computeThumb(0, 100, 200, 100)

		expect(thumb.visible).toBe(true)

		expect(thumb.size).toBe(50)

		expect(thumb.offset).toBe(0)
	})

	it('enforces the minimum thumb size', () => {
		const thumb = computeThumb(0, 10, 10000, 100)

		expect(thumb.size).toBeGreaterThanOrEqual(20)
	})

	it('scales the offset based on scroll position', () => {
		const thumb = computeThumb(50, 100, 200, 100)

		expect(thumb.offset).toBe(25)
	})
})

describe('findScrollableAncestor', () => {
	it('returns null when no ancestor scrolls', () => {
		const el = document.createElement('div')

		expect(findScrollableAncestor(el)).toBeNull()
	})

	it('returns the nearest scrollable ancestor', () => {
		const scrollable = document.createElement('div')

		Object.defineProperty(scrollable, 'scrollHeight', { configurable: true, value: 500 })
		Object.defineProperty(scrollable, 'clientHeight', { configurable: true, value: 100 })

		Object.defineProperty(scrollable, 'scrollWidth', { configurable: true, value: 100 })
		Object.defineProperty(scrollable, 'clientWidth', { configurable: true, value: 100 })

		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			overflowY: 'auto',
			overflowX: 'visible',
		} as CSSStyleDeclaration)

		const child = document.createElement('span')

		scrollable.appendChild(child)

		document.body.appendChild(scrollable)

		expect(findScrollableAncestor(child)).toBe(scrollable)

		scrollable.remove()
		;(window.getComputedStyle as ReturnType<typeof vi.spyOn>).mockRestore()
	})
})
