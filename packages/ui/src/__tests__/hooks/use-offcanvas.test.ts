import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useOffcanvas } from '../../hooks/use-offcanvas'

describe('useOffcanvas', () => {
	it('starts closed', () => {
		const { result } = renderHook(() => useOffcanvas())

		expect(result.current.open).toBe(false)
	})

	it('opens when setOpen(true) is called', () => {
		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)
	})

	it('closes when close() is called', () => {
		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.close()
		})

		expect(result.current.open).toBe(false)
	})

	it('returns a stable close reference across renders', () => {
		const { result, rerender } = renderHook(() => useOffcanvas())

		const first = result.current.close

		rerender()

		expect(result.current.close).toBe(first)
	})
})
