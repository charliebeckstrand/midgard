import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScrollWithin } from '../../hooks/use-scroll-within'
import { mockDomGeometry } from '../helpers'

function buildScrollable() {
	const scroller = document.createElement('div')

	const node = document.createElement('div')

	scroller.appendChild(node)

	document.body.appendChild(scroller)

	Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 100 })

	// Genuinely overflows: scrollWithin only treats an ancestor as the scroller
	// when its content exceeds its client box.
	Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1000 })

	Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0, writable: true })

	scroller.scrollTo = vi.fn()

	return { scroller, node }
}

/**
 * An outer scroller that overflows both ways, with a wrapper between it and the node that
 * clips whichever axes `clip` names. Without the clip guard the walk would continue past
 * the wrapper and scroll the outer container to reveal the node.
 */
function buildClippedTree(clip: { overflowX: string; overflowY: string }) {
	const overflow = new Map<Element, { overflowX: string; overflowY: string }>()

	vi.spyOn(window, 'getComputedStyle').mockImplementation(
		(el: Element) =>
			(overflow.get(el) ?? { overflowX: 'visible', overflowY: 'visible' }) as CSSStyleDeclaration,
	)

	const outer = document.createElement('div')

	const wrapper = document.createElement('div')

	const node = document.createElement('div')

	outer.appendChild(wrapper)

	wrapper.appendChild(node)

	document.body.appendChild(outer)

	overflow.set(outer, { overflowX: 'auto', overflowY: 'auto' })

	overflow.set(wrapper, clip)

	mockDomGeometry(outer, {
		clientWidth: 100,
		clientHeight: 100,
		scrollWidth: 1000,
		scrollHeight: 1000,
		scrollLeft: 0,
		scrollTop: 0,
	})

	outer.scrollTo = vi.fn()

	outer.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 })

	return { outer, node }
}

describe('useScrollWithin', () => {
	it('returns a function', () => {
		const { result } = renderHook(() => useScrollWithin())

		expect(typeof result.current).toBe('function')
	})

	it('returns the same function across renders', () => {
		const { result, rerender } = renderHook(() => useScrollWithin())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('is a no-op when called with null', () => {
		const { result } = renderHook(() => useScrollWithin())

		expect(() => result.current(null)).not.toThrow()
	})

	it('is a no-op when the node has no scrollable ancestor', () => {
		const { result } = renderHook(() => useScrollWithin())

		const node = document.createElement('div')

		document.body.appendChild(node)

		expect(() => result.current(node)).not.toThrow()

		node.remove()
	})

	describe('inside a scrollable ancestor', () => {
		afterEach(() => {
			vi.restoreAllMocks()

			document.body.innerHTML = ''
		})

		function stubScrollable() {
			vi.spyOn(window, 'getComputedStyle').mockReturnValue({
				overflowY: 'auto',
			} as CSSStyleDeclaration)
		}

		it('scrolls to the start when block="start"', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 50, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'start' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'auto' })
		})

		it('centers the node when block="center"', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 10, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'center', behavior: 'smooth' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -30, behavior: 'smooth' })
		})

		it('scrolls to the end when block="end"', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 10, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'end' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -70, behavior: 'auto' })
		})

		it('is a no-op when the node is already fully visible (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 20, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).not.toHaveBeenCalled()
		})

		it('scrolls up when the node is above the viewport (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: -30, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -30, behavior: 'auto' })
		})

		it('scrolls down when the node is below the viewport (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 110, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 30, behavior: 'auto' })
		})

		it('subtracts the scroller top border from the offset', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			// Border-box rect top vs padding-box scroll metrics: clientTop is the
			// top border width and must come off the offset.
			Object.defineProperty(scroller, 'clientTop', { configurable: true, value: 5 })

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 50, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'start' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 45, behavior: 'auto' })
		})

		it('skips an ancestor with a scroll style that does not actually overflow', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			// Content fits the client box: not a real scroller, so scrollTo no-ops.
			Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 100 })

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 110, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).not.toHaveBeenCalled()
		})

		it('stops at a clipping ancestor instead of scrolling an outer container', () => {
			const { outer, node } = buildClippedTree({ overflowX: 'visible', overflowY: 'hidden' })

			// Node sits below the outer viewport; a reveal would otherwise scroll it.
			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 200, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(outer.scrollTo).not.toHaveBeenCalled()
		})
	})
})

describe('useScrollWithin inline axis', () => {
	afterEach(() => {
		vi.restoreAllMocks()

		document.body.innerHTML = ''
	})

	/** A scroller that overflows on both axes, with the metrics jsdom reports as 0. */
	function buildBothAxes() {
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			overflowX: 'auto',
			overflowY: 'auto',
		} as CSSStyleDeclaration)

		const scroller = document.createElement('div')

		const node = document.createElement('div')

		scroller.appendChild(node)

		document.body.appendChild(scroller)

		mockDomGeometry(scroller, {
			clientHeight: 100,
			clientWidth: 100,
			scrollHeight: 1000,
			scrollWidth: 1000,
			scrollTop: 0,
			scrollLeft: 0,
		})

		scroller.scrollTo = vi.fn()

		scroller.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 })

		return { scroller, node }
	}

	it('leaves the horizontal position alone when inline is omitted', () => {
		const { scroller, node } = buildBothAxes()

		// Off-screen on both axes; only the block axis was asked for.
		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 200, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { block: 'start' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({
			top: 200,
			left: undefined,
			behavior: 'auto',
		})
	})

	it('scrolls the inline axis to the start', () => {
		const { scroller, node } = buildBothAxes()

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { block: 'start', inline: 'start' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 10, left: 200, behavior: 'auto' })
	})

	it('centers on the inline axis', () => {
		const { scroller, node } = buildBothAxes()

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 10, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { block: 'center', inline: 'center' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -30, left: -30, behavior: 'auto' })
	})

	it('resolves each axis independently under nearest', () => {
		const { scroller, node } = buildBothAxes()

		// Horizontally off to the right, vertically already in view: only left moves.
		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 150, y: 20, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { inline: 'nearest' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({
			top: undefined,
			left: 70,
			behavior: 'auto',
		})
	})

	it('does not scroll at all when nearest finds the node visible on both axes', () => {
		const { scroller, node } = buildBothAxes()

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 20, y: 20, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { inline: 'nearest' })

		expect(scroller.scrollTo).not.toHaveBeenCalled()
	})

	it('subtracts the scroller left border from the inline offset', () => {
		const { scroller, node } = buildBothAxes()

		Object.defineProperty(scroller, 'clientLeft', { configurable: true, value: 5 })

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 50, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { block: 'start', inline: 'start' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 10, left: 45, behavior: 'auto' })
	})

	it('accepts an ancestor that overflows only horizontally when inline is requested', () => {
		const { scroller, node } = buildBothAxes()

		// Vertically it now fits; horizontally it still does not.
		mockDomGeometry(scroller, { scrollHeight: 100 })

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { inline: 'start' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({
			top: undefined,
			left: 200,
			behavior: 'auto',
		})
	})

	it('stops at an ancestor that clips the requested inline axis', () => {
		const { outer, node } = buildClippedTree({ overflowX: 'hidden', overflowY: 'visible' })

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { inline: 'start' })

		expect(outer.scrollTo).not.toHaveBeenCalled()
	})
})
