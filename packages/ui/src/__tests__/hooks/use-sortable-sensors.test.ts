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

	it('threads a custom keyboardCoordinateGetter into the keyboard sensor', () => {
		const keyboardCoordinateGetter = () => undefined

		const { result } = renderHook(() => useSortableSensors({ keyboardCoordinateGetter }))

		// The keyboard sensor trails the pointer sensor; its options carry the getter.
		const keyboardSensor = result.current.at(-1)

		expect(keyboardSensor?.options).toMatchObject({ coordinateGetter: keyboardCoordinateGetter })
	})

	it('keeps the sensors array stable across renders with the keyboard sensor on', () => {
		const { result, rerender } = renderHook(() => useSortableSensors())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('rebuilds the sensors array when the keyboard coordinate getter changes', () => {
		const { result, rerender } = renderHook(
			({ getter }) => useSortableSensors({ keyboardCoordinateGetter: getter }),
			{ initialProps: { getter: () => undefined } },
		)

		const first = result.current

		rerender({ getter: () => undefined })

		expect(result.current).not.toBe(first)
	})
})
