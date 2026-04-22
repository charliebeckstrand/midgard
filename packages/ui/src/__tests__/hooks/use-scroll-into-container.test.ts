import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollIntoContainer } from '../../hooks/use-scroll-into-container'

describe('useScrollIntoContainer', () => {
	it('returns a function', () => {
		const { result } = renderHook(() => useScrollIntoContainer())

		expect(typeof result.current).toBe('function')
	})

	it('returns the same function across renders', () => {
		const { result, rerender } = renderHook(() => useScrollIntoContainer())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('is a no-op when called with null', () => {
		const { result } = renderHook(() => useScrollIntoContainer())

		expect(() => result.current(null)).not.toThrow()
	})

	it('is a no-op when the node has no scrollable ancestor', () => {
		const { result } = renderHook(() => useScrollIntoContainer())

		const node = document.createElement('div')

		document.body.appendChild(node)

		expect(() => result.current(node)).not.toThrow()

		node.remove()
	})
})
