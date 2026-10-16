import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResponsiveValue } from '../../hooks/use-responsive-value'
import { BREAKPOINT_WIDTHS } from '../../types/responsive'
import { stubMatchMedia } from '../helpers'

const viewportAt = (width: string) => (query: string) => {
	const min = /min-width: ([\d.]+)rem/.exec(query)?.[1]

	return min !== undefined && Number(min) <= Number.parseFloat(width)
}

describe('useResponsiveValue', () => {
	it('returns a bare value and asks for no breakpoint', () => {
		const matchMedia = stubMatchMedia(() => true)

		const { result } = renderHook(() => useResponsiveValue('horizontal', 'vertical'))

		expect(result.current).toBe('horizontal')
		expect(matchMedia).not.toHaveBeenCalled()
	})

	it('takes the value of the largest breakpoint that the viewport reaches', () => {
		stubMatchMedia(viewportAt(BREAKPOINT_WIDTHS.md))

		const { result } = renderHook(() => useResponsiveValue({ initial: 'a', sm: 'b', lg: 'c' }, 'z'))

		expect(result.current).toBe('b')
	})

	it('takes the fallback below the first named breakpoint', () => {
		stubMatchMedia(() => false)

		const { result } = renderHook(() => useResponsiveValue({ md: 'b' }, 'z'))

		expect(result.current).toBe('z')
	})

	it('asks only for the breakpoints that the value names', () => {
		const matchMedia = stubMatchMedia(() => false)

		renderHook(() => useResponsiveValue({ initial: 'a', sm: 'b' }, 'z'))

		const queries = new Set(matchMedia.mock.calls.map(([query]) => query))

		expect([...queries]).toEqual([`(min-width: ${BREAKPOINT_WIDTHS.sm})`])
	})
})
