import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useRoving } from '../../hooks/use-keyboard/use-roving'

describe('useRoving', () => {
	it('returns a function in focus mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returns a function in virtual mode', () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]', mode: 'virtual' })
		})

		expect(typeof result.current).toBe('function')
	})

	it('returned handler is referentially stable across renders', () => {
		const { result, rerender } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)

			return useRoving(ref, { itemSelector: '[role="option"]' })
		})

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
