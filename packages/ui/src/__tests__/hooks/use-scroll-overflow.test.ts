import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollOverflow } from '../../hooks/use-scroll-overflow'
import { mockDomGeometry } from '../helpers/mock-dom-geometry'

function buildScroller(geometry: {
	scrollTop: number
	clientHeight: number
	scrollHeight: number
}) {
	const node = document.createElement('div')

	document.body.appendChild(node)

	return mockDomGeometry(node, geometry)
}

function scrollTo(node: HTMLElement, scrollTop: number) {
	mockDomGeometry(node, { scrollTop })

	node.dispatchEvent(new Event('scroll'))
}

describe('useScrollOverflow', () => {
	it('returns the same callback ref across renders', () => {
		const { result, rerender } = renderHook(() => useScrollOverflow())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('is a no-op when called with null', () => {
		const { result } = renderHook(() => useScrollOverflow())

		expect(() => result.current(null)).not.toThrow()
	})

	it('stamps no attributes when content fits', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 200 })

		result.current(node)

		expect(node.hasAttribute('data-overflow-above')).toBe(false)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		node.remove()
	})

	it('stamps data-overflow-below on attach when content overflows', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })

		result.current(node)

		expect(node.hasAttribute('data-overflow-above')).toBe(false)

		expect(node.hasAttribute('data-overflow-below')).toBe(true)

		node.remove()
	})

	it('flips the attributes as the node scrolls between its edges', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })

		result.current(node)

		scrollTo(node, 100)

		expect(node.hasAttribute('data-overflow-above')).toBe(true)

		expect(node.hasAttribute('data-overflow-below')).toBe(true)

		scrollTo(node, 200)

		expect(node.hasAttribute('data-overflow-above')).toBe(true)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		scrollTo(node, 0)

		expect(node.hasAttribute('data-overflow-above')).toBe(false)

		expect(node.hasAttribute('data-overflow-below')).toBe(true)

		node.remove()
	})

	it('tolerates fractional offsets within a pixel of an edge', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })

		result.current(node)

		// A zoomed display can settle at 199.6 of 200; treat it as the edge.
		scrollTo(node, 199.6)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		node.remove()
	})

	it('removes listeners and attributes via the ref cleanup', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 100, clientHeight: 200, scrollHeight: 400 })

		const cleanup = result.current(node)

		expect(node.hasAttribute('data-overflow-above')).toBe(true)

		expect(typeof cleanup).toBe('function')

		if (typeof cleanup === 'function') cleanup()

		expect(node.hasAttribute('data-overflow-above')).toBe(false)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		// A scroll after detach must not restamp the attributes.
		scrollTo(node, 100)

		expect(node.hasAttribute('data-overflow-above')).toBe(false)

		node.remove()
	})

	it('re-measures when children are added or removed', async () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 200 })

		result.current(node)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		mockDomGeometry(node, { scrollHeight: 400 })

		node.appendChild(document.createElement('div'))

		// MutationObserver callbacks flush as microtasks.
		await Promise.resolve()

		expect(node.hasAttribute('data-overflow-below')).toBe(true)

		node.remove()
	})
})
