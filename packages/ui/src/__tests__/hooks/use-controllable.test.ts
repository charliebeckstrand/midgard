import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useControllable, useControllableFlag } from '../../hooks/use-controllable'

describe('useControllable', () => {
	it('uses defaultValue for initial uncontrolled state', () => {
		const { result } = renderHook(() => useControllable({ defaultValue: 'hello' }))

		expect(result.current[0]).toBe('hello')
	})

	it('returns undefined when no defaultValue is provided', () => {
		const { result } = renderHook(() => useControllable({}))

		expect(result.current[0]).toBeUndefined()
	})

	it('updates internal state in uncontrolled mode', () => {
		const { result } = renderHook(() => useControllable({ defaultValue: 0 }))

		act(() => {
			result.current[1](42)
		})

		expect(result.current[0]).toBe(42)
	})

	it('calls onValueChange when value is set in uncontrolled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 'a', onValueChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('uses the provided value in controlled mode', () => {
		const { result } = renderHook(() => useControllable({ value: 'controlled' }))

		expect(result.current[0]).toBe('controlled')
	})

	it('keeps returning the controlled value after setValue', () => {
		const { result } = renderHook(() => useControllable({ value: 'locked' }))

		act(() => {
			result.current[1]('new-value')
		})

		expect(result.current[0]).toBe('locked')
	})

	it('resolves to the last set value when the consumer clears the value prop', () => {
		const { result, rerender } = renderHook(
			({ value }: { value?: string }) => useControllable({ value }),
			{ initialProps: { value: 'selected' } as { value?: string } },
		)

		// A controlled consumer clearing in response to onValueChange: setValue
		// fires while controlled, then the value prop drops to undefined.
		act(() => {
			result.current[1](undefined)
		})

		rerender({ value: undefined })

		expect(result.current[0]).toBeUndefined()
	})

	it('calls onValueChange in controlled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 'a', onValueChange }))

		act(() => {
			result.current[1]('b')
		})

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('treats null value as controlled with undefined result', () => {
		const { result } = renderHook(() => useControllable({ value: null, defaultValue: 'fallback' }))

		expect(result.current[0]).toBeUndefined()
	})

	it('keeps internal state current when a controlled value clears to undefined', () => {
		const { result, rerender } = renderHook(
			({ value }: { value: string | undefined }) => useControllable({ value }),
			{ initialProps: { value: undefined as string | undefined } },
		)

		// Select while uncontrolled; the parent echoes the value back as controlled.
		act(() => {
			result.current[1]('a')
		})

		rerender({ value: 'a' })

		// Deselect: the setter resolves undefined and the parent clears its state,
		// flipping the hook back to uncontrolled. The stale internal value must
		// not resurface.
		act(() => {
			result.current[1](undefined)
		})

		rerender({ value: undefined })

		expect(result.current[0]).toBeUndefined()
	})

	it('chains functional updates batched in a single act', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 0, onValueChange }))

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1)

			result.current[1]((prev) => (prev ?? 0) + 1)
		})

		expect(result.current[0]).toBe(2)

		expect(onValueChange).toHaveBeenNthCalledWith(1, 1)

		expect(onValueChange).toHaveBeenNthCalledWith(2, 2)
	})

	it('reports a cleared value as null, whichever nullish clear was passed (§7.3)', () => {
		// §7.3: the public callback must never emit `undefined` — echoed back into
		// `value` it would read as uncontrolled. Both clears converge on `null`.
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable<number>({ defaultValue: 1, onValueChange }))

		act(() => result.current[1](undefined))

		expect(onValueChange).toHaveBeenLastCalledWith(null)

		act(() => result.current[1](2))

		act(() => result.current[1](null))

		expect(onValueChange).toHaveBeenLastCalledWith(null)

		// Internally "no value" stays `undefined`, so the read side is unchanged.
		expect(result.current[0]).toBeUndefined()
	})

	it('chains batched functional updates in controlled mode', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 10, onValueChange }))

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1)

			result.current[1]((prev) => (prev ?? 0) + 1)
		})

		expect(onValueChange).toHaveBeenNthCalledWith(1, 11)

		expect(onValueChange).toHaveBeenNthCalledWith(2, 12)
	})
})

describe('useControllable change reports', () => {
	it('does not report a set to the value it already holds', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 'a', onValueChange }))

		act(() => result.current[1]('a'))

		act(() => result.current[1]((prev) => prev))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('does not report a controlled set to the value the owner passes', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 'a', onValueChange }))

		act(() => result.current[1]('a'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('reports a repeated set in one batch once', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ defaultValue: 'a', onValueChange }))

		act(() => {
			result.current[1]('b')

			result.current[1]('b')
		})

		expect(onValueChange).toHaveBeenCalledTimes(1)
	})

	it('reports each refused controlled change, and renders nothing for it', async () => {
		const onValueChange = vi.fn()

		let renders = 0

		const { result } = renderHook(() => {
			renders += 1

			return useControllable({ value: 'a', onValueChange })
		})

		const before = renders

		// Each act is its own task, as two presses are.
		await act(async () => result.current[1]('b'))

		await act(async () => result.current[1]('b'))

		expect(renders).toBe(before)

		expect(onValueChange).toHaveBeenCalledTimes(2)

		expect(result.current[0]).toBe('a')
	})

	it('resolves an updater from the value on screen after a refused change', async () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: 10, onValueChange }))

		await act(async () => result.current[1]((prev) => (prev ?? 0) + 1))

		await act(async () => result.current[1]((prev) => (prev ?? 0) + 1))

		expect(onValueChange).toHaveBeenNthCalledWith(1, 11)

		expect(onValueChange).toHaveBeenNthCalledWith(2, 11)
	})

	it('reports a change back to a value the owner shows but did not hold', async () => {
		// The owner derives what it shows from its own state and more: it holds
		// `true` after the first report, but shows `false`. The second report
		// changes the state of the owner, so it goes out.
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllable({ value: false, onValueChange }))

		await act(async () => result.current[1](true))

		await act(async () => result.current[1](false))

		expect(onValueChange.mock.calls).toEqual([[true], [false]])
	})
})

describe('useControllable controlled to uncontrolled', () => {
	it('stays controlled once the owner passes a value, so undefined reads as empty', () => {
		const { result, rerender } = renderHook(
			({ value }: { value?: string }) => useControllable({ value, defaultValue: 'default' }),
			{ initialProps: { value: 'a' } as { value?: string } },
		)

		// A pick from the reader, then the owner moves the value on its own.
		act(() => result.current[1]('picked'))

		rerender({ value: 'b' })

		rerender({ value: undefined })

		expect(result.current[0]).toBeUndefined()

		act(() => result.current[1]('c'))

		expect(result.current[0]).toBeUndefined()
	})
})

describe('useControllableFlag', () => {
	it('starts false with no defaultValue', () => {
		const { result } = renderHook(() => useControllableFlag({}))

		expect(result.current[0]).toBe(false)
	})

	it('reads the controlled flag over the default', () => {
		const { result } = renderHook(() => useControllableFlag({ value: false, defaultValue: true }))

		expect(result.current[0]).toBe(false)
	})

	it('reads and reports a cleared flag as false', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllableFlag({ defaultValue: true, onValueChange }))

		act(() => {
			result.current[1](null)
		})

		expect(result.current[0]).toBe(false)

		expect(onValueChange).toHaveBeenCalledWith(false)
	})

	it('does not report a cleared flag that is already false', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllableFlag({ onValueChange }))

		act(() => result.current[1](null))

		act(() => result.current[1](undefined))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('toggles through a functional update', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useControllableFlag({ onValueChange }))

		act(() => {
			result.current[1]((open) => !open)
		})

		expect(result.current[0]).toBe(true)

		expect(onValueChange).toHaveBeenCalledWith(true)
	})
})
