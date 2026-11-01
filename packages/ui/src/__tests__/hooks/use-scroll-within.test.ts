import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { scrollNodeWithin, useScrollWithin } from '../../hooks/use-scroll-within'
import { attach, mockDomGeometry } from '../helpers'

function makeScrollable() {
	const scroller = document.createElement('div')

	const node = document.createElement('div')

	scroller.appendChild(node)

	attach(scroller)

	// Genuinely overflows: scrollWithin only treats an ancestor as the scroller
	// when its content exceeds its client box.
	mockDomGeometry(scroller, { clientHeight: 100, scrollHeight: 1000, scrollTop: 0 })

	scroller.scrollTo = vi.fn()

	return { scroller, node }
}

/**
 * An outer scroller that overflows both ways, with a wrapper between it and the node that
 * clips whichever axes `clip` names. Without the clip guard the walk would continue past
 * the wrapper and scroll the outer container to reveal the node.
 */
function makeClippedTree(clip: { overflowX: string; overflowY: string }) {
	const outer = document.createElement('div')

	const wrapper = document.createElement('div')

	const node = document.createElement('div')

	outer.appendChild(wrapper)

	wrapper.appendChild(node)

	attach(outer)

	// Each other node reads the real style of jsdom, which does not clip.
	const { getComputedStyle } = window

	vi.when(vi.spyOn(window, 'getComputedStyle').mockImplementation(getComputedStyle))
		.calledWith(outer)
		.thenReturn({ overflowX: 'auto', overflowY: 'auto' } as CSSStyleDeclaration)
		.calledWith(wrapper)
		.thenReturn(clip as CSSStyleDeclaration)

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

/**
 * The offset arithmetic, pinned over geometry this file states.
 *
 * Each case builds a scroller with a known client box and a known content box,
 * spies on `scrollTo`, and asserts the offset the hook asked for. That is the
 * right shape for the fine-grained claims: the scroller's top border coming out
 * of the offset, each axis resolving independently under `nearest`, and the
 * walk stopping at an ancestor that clips the requested axis. A browser gives
 * what layout produces, so those inputs could only be approached, never set.
 *
 * It is not the whole contract, because a spy on `scrollTo` reads the number
 * the hook asked for and stops there. Whether that number puts the node where
 * the caller meant is asserted against a real scroller in
 * `browser/geometry/scroll-within.test.tsx`.
 */
describe('useScrollWithin', () => {
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

		attach(node)

		expect(() => result.current(node)).not.toThrow()
	})

	describe('inside a scrollable ancestor', () => {
		function stubScrollable() {
			vi.spyOn(window, 'getComputedStyle').mockReturnValue({
				overflowY: 'auto',
			} as CSSStyleDeclaration)
		}

		// The scroller box spans y 0 to 100, and the node is 20 tall.
		it.each<
			[string, number, Parameters<ReturnType<typeof useScrollWithin>>[1], ScrollToOptions | null]
		>([
			[
				'scrolls to the start when block="start"',
				50,
				{ block: 'start' },
				{ top: 50, behavior: 'auto' },
			],
			[
				'centers the node when block="center"',
				10,
				{ block: 'center', behavior: 'smooth' },
				{ top: -30, behavior: 'smooth' },
			],
			['scrolls to the end when block="end"', 10, { block: 'end' }, { top: -70, behavior: 'auto' }],
			['is a no-op when the node is already fully visible (nearest)', 20, undefined, null],
			[
				'scrolls up when the node is above the viewport (nearest)',
				-30,
				undefined,
				{ top: -30, behavior: 'auto' },
			],
			[
				'scrolls down when the node is below the viewport (nearest)',
				110,
				undefined,
				{ top: 30, behavior: 'auto' },
			],
		])('%s', (_name, nodeY, options, expected) => {
			stubScrollable()

			const { scroller, node } = makeScrollable()

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: nodeY, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, options)

			// A null expectation is a node already in view, which asks for no scroll.
			expect(vi.mocked(scroller.scrollTo).mock.calls).toEqual(expected ? [[expected]] : [])
		})

		it('subtracts the scroller top border from the offset', () => {
			stubScrollable()

			const { scroller, node } = makeScrollable()

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

			const { scroller, node } = makeScrollable()

			// Content fits the client box: not a real scroller, so scrollTo no-ops.
			mockDomGeometry(scroller, { scrollHeight: 100 })

			scroller.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: 100 })

			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 110, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).not.toHaveBeenCalled()
		})

		it('stops at a clipping ancestor instead of scrolling an outer container', () => {
			const { outer, node } = makeClippedTree({ overflowX: 'visible', overflowY: 'hidden' })

			// Node sits below the outer viewport; a reveal would otherwise scroll it.
			node.getBoundingClientRect = () => DOMRect.fromRect({ y: 200, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(outer.scrollTo).not.toHaveBeenCalled()
		})
	})
})

describe('useScrollWithin inline axis', () => {
	/** A scroller that overflows on both axes, with the metrics jsdom reports as 0. */
	function makeBothAxes() {
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			overflowX: 'auto',
			overflowY: 'auto',
		} as CSSStyleDeclaration)

		const scroller = document.createElement('div')

		const node = document.createElement('div')

		scroller.appendChild(node)

		attach(scroller)

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

	it.for<{
		name: string
		at: { x: number; y: number }
		options: Parameters<ReturnType<typeof useScrollWithin>>[1]
		expected: ScrollToOptions | null
	}>([
		{
			// Off-screen on both axes; only the block axis was asked for.
			name: 'leaves the horizontal position alone when inline is omitted',
			at: { x: 200, y: 200 },
			options: { block: 'start' },
			expected: { top: 200, left: undefined, behavior: 'auto' },
		},
		{
			name: 'scrolls the inline axis to the start',
			at: { x: 200, y: 10 },
			options: { block: 'start', inline: 'start' },
			expected: { top: 10, left: 200, behavior: 'auto' },
		},
		{
			name: 'centers on the inline axis',
			at: { x: 10, y: 10 },
			options: { block: 'center', inline: 'center' },
			expected: { top: -30, left: -30, behavior: 'auto' },
		},
		{
			// Horizontally off to the right, vertically already in view: only left moves.
			name: 'resolves each axis independently under nearest',
			at: { x: 150, y: 20 },
			options: { inline: 'nearest' },
			expected: { top: undefined, left: 70, behavior: 'auto' },
		},
		{
			name: 'does not scroll at all when nearest finds the node visible on both axes',
			at: { x: 20, y: 20 },
			options: { inline: 'nearest' },
			expected: null,
		},
	])('$name', ({ at, options, expected }) => {
		const { scroller, node } = makeBothAxes()

		node.getBoundingClientRect = () => DOMRect.fromRect({ ...at, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, options)

		// A null expectation is a node in view on both axes, which asks for no scroll.
		expect(vi.mocked(scroller.scrollTo).mock.calls).toEqual(expected ? [[expected]] : [])
	})

	it('subtracts the scroller left border from the inline offset', () => {
		const { scroller, node } = makeBothAxes()

		Object.defineProperty(scroller, 'clientLeft', { configurable: true, value: 5 })

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 50, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { block: 'start', inline: 'start' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 10, left: 45, behavior: 'auto' })
	})

	it('accepts an ancestor that overflows only horizontally when inline is requested', () => {
		const { scroller, node } = makeBothAxes()

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
		const { outer, node } = makeClippedTree({ overflowX: 'hidden', overflowY: 'visible' })

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 10, width: 20, height: 20 })

		const { result } = renderHook(() => useScrollWithin())

		result.current(node, { inline: 'start' })

		expect(outer.scrollTo).not.toHaveBeenCalled()
	})
})

/**
 * The scroll without the ancestor walk, for a caller that owns its scroller (the tab list
 * viewport). No axis has a default here: an axis left out keeps its position.
 */
describe('scrollNodeWithin', () => {
	/** A horizontal strip that spans x 0 to 100, scrolled to `scrollLeft`, with one 40-wide node. */
	function makeStrip(scrollLeft: number) {
		const scroller = document.createElement('div')

		const node = document.createElement('div')

		scroller.appendChild(node)

		attach(scroller)

		mockDomGeometry(scroller, {
			clientWidth: 100,
			clientHeight: 20,
			scrollWidth: 1000,
			scrollHeight: 20,
			scrollLeft,
			scrollTop: 0,
		})

		scroller.scrollTo = vi.fn()

		scroller.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 20 })

		return { scroller, node }
	}

	it.each<[string, number, number, ScrollToOptions | null]>([
		['scrolls back when the node starts before the viewport', 50, -15, { left: 35 }],
		['scrolls forward the least to reveal a node past the trailing edge', 0, 80, { left: 20 }],
		['is a no-op when the node is flush with the leading edge', 0, 0, null],
		['is a no-op when the node is flush with the trailing edge', 0, 60, null],
	])('%s', (_name, scrollLeft, nodeX, expected) => {
		const { scroller, node } = makeStrip(scrollLeft)

		// The node is taller than the strip. The block axis was not asked for, so it stays.
		node.getBoundingClientRect = () => DOMRect.fromRect({ x: nodeX, y: 30, width: 40, height: 40 })

		scrollNodeWithin(scroller, node, { inline: 'nearest' })

		expect(vi.mocked(scroller.scrollTo).mock.calls).toEqual(
			expected ? [[{ top: undefined, ...expected, behavior: 'auto' }]] : [],
		)
	})

	it('scrolls the scroller it is given, with no ancestor walk', () => {
		// The walk of scrollWithin skips this strip because it fits vertically. The caller
		// names it, so it scrolls.
		const { scroller, node } = makeStrip(0)

		node.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 30, width: 40, height: 10 })

		scrollNodeWithin(scroller, node, { block: 'nearest' })

		expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 20, left: undefined, behavior: 'auto' })
	})
})
