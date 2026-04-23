import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScrollWithin } from '../../hooks/use-scroll-within'

type RectOverrides = Partial<DOMRect>

function rect(overrides: RectOverrides = {}): DOMRect {
	return {
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		toJSON: () => ({}),
		...overrides,
	} as DOMRect
}

function buildScrollable() {
	const scroller = document.createElement('div')
	const node = document.createElement('div')

	scroller.appendChild(node)
	document.body.appendChild(scroller)

	Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 100 })
	Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0, writable: true })

	scroller.scrollTo = vi.fn()

	return { scroller, node }
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

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: 50, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'start' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'auto' })
		})

		it('centers the node when block="center"', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: 10, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'center', behavior: 'smooth' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -30, behavior: 'smooth' })
		})

		it('scrolls to the end when block="end"', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: 10, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node, { block: 'end' })

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -70, behavior: 'auto' })
		})

		it('is a no-op when the node is already fully visible (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: 20, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).not.toHaveBeenCalled()
		})

		it('scrolls up when the node is above the viewport (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: -30, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: -30, behavior: 'auto' })
		})

		it('scrolls down when the node is below the viewport (nearest)', () => {
			stubScrollable()

			const { scroller, node } = buildScrollable()

			scroller.getBoundingClientRect = () => rect({ top: 0, height: 100 })
			node.getBoundingClientRect = () => rect({ top: 110, height: 20 })

			const { result } = renderHook(() => useScrollWithin())

			result.current(node)

			expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 30, behavior: 'auto' })
		})
	})
})
