import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSelectableValueChange } from '../../hooks/use-selectable-value-change'

describe('useSelectableValueChange', () => {
	it('forwards single-select value changes through to the wrapped callback', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, false))

		result.current('a')

		expect(onValueChange).toHaveBeenCalledWith('a')
	})

	it('forwards an explicit undefined when not in multi-select mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, false))

		result.current(undefined)

		expect(onValueChange).toHaveBeenCalledWith(undefined)
	})

	it('suppresses the undefined "cleared" event in multi-select mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, true))

		result.current(undefined)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('forwards array values in multi-select mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, true))

		result.current(['a', 'b'])

		expect(onValueChange).toHaveBeenCalledWith(['a', 'b'])
	})

	it('is a no-op when the upstream callback is undefined', () => {
		const { result } = renderHook(() => useSelectableValueChange<string>(undefined, false))

		expect(() => result.current('a')).not.toThrow()
	})

	it('returns a stable handler when dependencies are stable', () => {
		const onValueChange = vi.fn()

		const { result, rerender } = renderHook(
			({ multiple }: { multiple: boolean }) => useSelectableValueChange(onValueChange, multiple),
			{ initialProps: { multiple: false } },
		)

		const first = result.current

		rerender({ multiple: false })

		expect(result.current).toBe(first)
	})

	it('returns a new handler when the multiple flag flips', () => {
		const onValueChange = vi.fn()

		const { result, rerender } = renderHook(
			({ multiple }: { multiple: boolean }) => useSelectableValueChange(onValueChange, multiple),
			{ initialProps: { multiple: false } },
		)

		const first = result.current

		rerender({ multiple: true })

		expect(result.current).not.toBe(first)
	})
})
