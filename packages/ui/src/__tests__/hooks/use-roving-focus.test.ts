import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useRovingFocus } from '../../hooks/use-keyboard/use-roving-focus'

describe('useRovingFocus', () => {
	it('returns a function', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRovingFocus(ref, { itemSelector: '[role="option"]' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returned handler is referentially stable', () => {
		const { result, rerender } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRovingFocus(ref, { itemSelector: '[role="option"]' })
		})

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
