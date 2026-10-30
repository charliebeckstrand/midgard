import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSelectableValueChange } from '../../hooks/use-selectable-value-change'

describe('useSelectableValueChange', () => {
	it.for<{ name: string; multiple: boolean; value: string | string[] | null }>([
		{
			name: 'forwards single-select value changes through to the wrapped callback',
			multiple: false,
			value: 'a',
		},
		{
			// The value cascade already emits `null` on clear; single-select passes it
			// straight to the consumer rather than converting here.
			name: 'forwards a cleared single selection through as null (§7.3)',
			multiple: false,
			value: null,
		},
		{ name: 'forwards array values in multi-select mode', multiple: true, value: ['a', 'b'] },
	])('$name', ({ multiple, value }) => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, multiple))

		result.current(value)

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith(value)
	})

	it('suppresses the "cleared" event in multi-select mode', () => {
		// Multi-select spells no selection as an empty array, so there is no
		// cleared event to report.
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useSelectableValueChange(onValueChange, true))

		result.current(null)

		expect(onValueChange).not.toHaveBeenCalled()
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
