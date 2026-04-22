import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSortableSensors } from '../../hooks/use-sortable-sensors'

describe('useSortableSensors', () => {
	it('returns a non-empty sensors array by default', () => {
		const { result } = renderHook(() => useSortableSensors())

		expect(Array.isArray(result.current)).toBe(true)

		expect(result.current.length).toBeGreaterThan(0)
	})

	it('omits the keyboard sensor when keyboard is false', () => {
		const withKeyboard = renderHook(() => useSortableSensors({ keyboard: true })).result.current

		const withoutKeyboard = renderHook(() => useSortableSensors({ keyboard: false })).result.current

		expect(withoutKeyboard.length).toBe(withKeyboard.length - 1)
	})
})
