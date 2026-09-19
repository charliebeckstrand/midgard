import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollOverflow } from '../../hooks/use-scroll-overflow'
import { mockDomGeometry } from '../helpers/mock-dom-geometry'

/**
 * The ref's own contract, and the one comparison a browser cannot be asked for.
 *
 * What the hook does to a real scroller is asserted in
 * `browser/scroll-overflow.test.tsx`: a box that overflows, a scroll between
 * its edges, content growing under it, and a detach that stops the listening.
 * Three cases stay. Two are about the callback ref rather than any geometry —
 * that it keeps its identity across renders, and that it tolerates `null`. The
 * third is the edge tolerance, which needs a scroll offset a fraction short of
 * the end: a browser settles `scrollTop` where the engine and the device pixel
 * ratio put it, so the fraction has to be written rather than requested.
 */

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

	it('tolerates fractional offsets within a pixel of an edge', () => {
		const { result } = renderHook(() => useScrollOverflow())

		const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })

		result.current(node)

		// A zoomed display can settle at 199.6 of 200; treat it as the edge.
		scrollTo(node, 199.6)

		expect(node.hasAttribute('data-overflow-below')).toBe(false)

		node.remove()
	})
})
