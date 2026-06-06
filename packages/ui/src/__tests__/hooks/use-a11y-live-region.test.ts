import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yLiveRegion } from '../../hooks/a11y/use-a11y-live-region'

describe('useA11yLiveRegion', () => {
	it('defaults to a polite status region read atomically', () => {
		const { result } = renderHook(() => useA11yLiveRegion())

		expect(result.current).toMatchObject({
			role: 'status',
			'aria-live': 'polite',
			'aria-atomic': true,
		})

		expect(result.current.className).toBeUndefined()
	})

	it('maps assertive to an alert region', () => {
		const { result } = renderHook(() => useA11yLiveRegion({ level: 'assertive' }))

		expect(result.current.role).toBe('alert')

		expect(result.current['aria-live']).toBe('assertive')
	})

	it('adds sr-only when srOnly and merges extra classes', () => {
		const { result } = renderHook(() => useA11yLiveRegion({ srOnly: true, className: 'pt-2' }))

		expect(result.current.className).toBe('sr-only pt-2')
	})

	it('honors atomic = false', () => {
		const { result } = renderHook(() => useA11yLiveRegion({ atomic: false }))

		expect(result.current['aria-atomic']).toBe(false)
	})

	it('returns a referentially stable object across re-renders', () => {
		const { result, rerender } = renderHook(() => useA11yLiveRegion({ className: 'x' }))

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
