import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollOverflow } from '../../hooks/use-scroll-overflow'
import { attach, mockDomGeometry, present, renderUI, screen } from '../helpers'
import { stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * The ref's own contract, and the comparisons a browser cannot be asked for.
 *
 * What the hook does to a real scroller is asserted in
 * `browser/scroll-overflow.test.tsx`: a box that overflows, a scroll between
 * its edges, content growing under it, and a detach that stops the listening.
 * Two cases here are about the callback ref rather than any geometry — that it
 * keeps its identity across renders, and that it tolerates `null`. A third is
 * the edge tolerance, which needs a scroll offset a fraction short of the end:
 * a browser settles `scrollTop` where the engine and the device pixel ratio put
 * it, so the fraction has to be written rather than requested.
 *
 * The `enabled` cases are here for the same reason. A disabled watch is an
 * absence, so it is read as a ref that returns no cleanup and a node that takes
 * no attribute — a DOM-tree reading, which `CONVENTIONS.md` §10.5 keeps under
 * jsdom. The flip needs geometry that overflows before the re-attach, and only
 * a written `scrollHeight` holds still across it.
 */

/** A scroller whose watch the case turns on and off. */
function Probe({ enabled }: { enabled: boolean }) {
	const ref = useScrollOverflow({ enabled })

	return <div ref={ref} data-testid="scroller" />
}

function buildScroller(geometry: {
	scrollTop: number
	clientHeight: number
	scrollHeight: number
}) {
	return mockDomGeometry(attach(document.createElement('div')), geometry)
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
	})

	describe('enabled', () => {
		it('wires nothing and stamps nothing while disabled', () => {
			const { result } = renderHook(() => useScrollOverflow({ enabled: false }))

			const node = buildScroller({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })

			// The live list of observers the subject constructs. A wired watch builds
			// one on attach, so an empty list reads the absence itself.
			const observers = stubResizeObserver()

			// No cleanup comes back, which is the shape of a ref that wired nothing:
			// React has nothing to run on detach.
			expect(result.current(node)).toBeUndefined()

			expect(observers).toHaveLength(0)

			expect(node.hasAttribute('data-overflow-above')).toBe(false)

			expect(node.hasAttribute('data-overflow-below')).toBe(false)

			// And no listener. The extent above overflows, so a scroll would stamp
			// the below edge if the attach had added one.
			scrollTo(node, 0)

			expect(node.hasAttribute('data-overflow-below')).toBe(false)
		})

		it('starts the watch when the flag flips on, and clears it when it flips off', () => {
			const { rerender } = renderUI(<Probe enabled={false} />)

			// The extent is written before the flip, so the re-attach measures a
			// scroller that overflows.
			const node = mockDomGeometry(present(screen.getByTestId('scroller'), 'the scroller'), {
				scrollTop: 0,
				clientHeight: 200,
				scrollHeight: 400,
			})

			expect(node.hasAttribute('data-overflow-below')).toBe(false)

			// The flip swaps the ref identity, so React detaches the node and
			// attaches it again. The fresh attach measures an extent that overflows.
			rerender(<Probe enabled />)

			expect(node.hasAttribute('data-overflow-below')).toBe(true)

			// The reverse detach runs the cleanup, which drops both attributes.
			rerender(<Probe enabled={false} />)

			expect(node.hasAttribute('data-overflow-below')).toBe(false)

			expect(node.hasAttribute('data-overflow-above')).toBe(false)
		})
	})
})
