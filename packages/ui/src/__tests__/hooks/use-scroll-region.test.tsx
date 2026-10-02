import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { attach, mockDomGeometry } from '../helpers'

/**
 * The ref's own contract. What the hook does to a real scroller is asserted in
 * `browser/scroll-region.test.tsx`. These cases read the DOM tree only: a ref
 * that tolerates `null`, a `tabindex` that the consumer set and the hook keeps,
 * and the attributes that a detach removes.
 */

/** A node whose written geometry overflows on the x axis. */
function buildOverflowing() {
	const node = document.createElement('div')

	node.style.overflowX = 'auto'

	return mockDomGeometry(attach(node), {
		clientWidth: 200,
		scrollWidth: 600,
	})
}

describe('useScrollRegion', () => {
	it('returns the same callback ref across renders', () => {
		const { result, rerender } = renderHook(() => useScrollRegion({ label: 'Orders' }))

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('is a no-op when called with null', () => {
		const { result } = renderHook(() => useScrollRegion())

		expect(() => result.current(null)).not.toThrow()
	})

	it('keeps a tabindex that the node already carries', () => {
		const { result } = renderHook(() => useScrollRegion({ label: 'Orders' }))

		const node = buildOverflowing()

		node.setAttribute('tabindex', '-1')

		result.current(node)

		expect(node.getAttribute('tabindex')).toBe('-1')

		expect(node.hasAttribute('role')).toBe(false)
	})

	it('prefers labelledBy over label', () => {
		const { result } = renderHook(() => useScrollRegion({ label: 'Orders', labelledBy: 'title' }))

		const node = buildOverflowing()

		result.current(node)

		expect(node.getAttribute('aria-labelledby')).toBe('title')

		expect(node.hasAttribute('aria-label')).toBe(false)
	})

	it('removes its attributes on detach', () => {
		const { result } = renderHook(() => useScrollRegion({ label: 'Orders' }))

		const node = buildOverflowing()

		const cleanup = result.current(node)

		expect(node.getAttribute('tabindex')).toBe('0')

		expect(node.getAttribute('role')).toBe('region')

		if (typeof cleanup === 'function') cleanup()

		expect(node.hasAttribute('tabindex')).toBe(false)

		expect(node.hasAttribute('role')).toBe(false)

		expect(node.hasAttribute('aria-label')).toBe(false)
	})
})
