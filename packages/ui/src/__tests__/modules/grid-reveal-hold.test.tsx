import { renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useGridRevealHold } from '../../modules/grid/use-grid-reveal-hold'

/**
 * A collapsed row wakes in two commits. The row comes back on screen at the
 * closed track, a forced style flush records that style, and only then does
 * the track open. Without the flush, the browser sees the open style first, and
 * the row snaps open. The compiled run of this test proves that the React
 * Compiler keeps the flush.
 */
afterEach(() => {
	vi.restoreAllMocks()
})

it('flushes the styles before a waking row opens', () => {
	const flush = vi.spyOn(document.documentElement, 'getBoundingClientRect')

	const { result, rerender } = renderHook(({ expanded }) => useGridRevealHold(expanded), {
		initialProps: { expanded: false },
	})

	expect(result.current.open).toBe(false)

	flush.mockClear()

	rerender({ expanded: true })

	expect(flush).toHaveBeenCalledTimes(1)

	expect(result.current.open).toBe(true)
})

it('closes a collapsing row with no flush', () => {
	const flush = vi.spyOn(document.documentElement, 'getBoundingClientRect')

	const { result, rerender } = renderHook(({ expanded }) => useGridRevealHold(expanded), {
		initialProps: { expanded: true },
	})

	flush.mockClear()

	rerender({ expanded: false })

	expect(flush).not.toHaveBeenCalled()

	expect(result.current.open).toBe(false)
})
