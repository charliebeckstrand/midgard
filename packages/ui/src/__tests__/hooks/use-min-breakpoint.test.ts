import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMinBreakpoint } from '../../hooks/use-min-breakpoint'
import { BREAKPOINT_WIDTHS } from '../../types/responsive'
import { stubMatchMedia } from '../helpers'

describe('useMinBreakpoint', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('asks for the named breakpoint in the unit Tailwind emits', () => {
		// `rem`, not `px`: at a root font size other than 16px a pixel literal and the matching
		// `lg:` class part company, and the JS answer stops describing the layout.
		const matchMedia = stubMatchMedia(() => false)

		renderHook(() => useMinBreakpoint('lg'))

		expect(matchMedia).toHaveBeenCalledWith('(min-width: 64rem)')
	})

	it('returns false below the breakpoint', () => {
		stubMatchMedia(() => false)

		const { result } = renderHook(() => useMinBreakpoint('md'))

		expect(result.current).toBe(false)
	})

	it('returns true at the breakpoint', () => {
		stubMatchMedia((query) => query === `(min-width: ${BREAKPOINT_WIDTHS.md})`)

		const { result } = renderHook(() => useMinBreakpoint('md'))

		expect(result.current).toBe(true)
	})

	it('covers every breakpoint the class prefixes offer', () => {
		// The scale is the contract: a name that generates an `xl:` prefix has to be answerable
		// here too, or a consumer is pushed back to a pixel literal for that one tier.
		expect(Object.keys(BREAKPOINT_WIDTHS)).toEqual(['sm', 'md', 'lg', 'xl', '2xl'])
	})
})
