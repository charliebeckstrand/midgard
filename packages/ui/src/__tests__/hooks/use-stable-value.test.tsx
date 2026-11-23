import { render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStableValue } from '../../hooks/use-stable-value'

/** Two lists with the same items in the same order. */
const sameItems = (prev: readonly number[], next: readonly number[]) =>
	prev.length === next.length && prev.every((item, index) => item === next[index])

describe('useStableValue', () => {
	it('gives the candidate of the first render', () => {
		const first = [1, 2]

		const { result } = renderHook(() => useStableValue(first, sameItems))

		expect(result.current).toBe(first)
	})

	it('holds the previous identity while the content is the same', () => {
		const first = [1, 2]

		const { result, rerender } = renderHook(({ value }) => useStableValue(value, sameItems), {
			initialProps: { value: first },
		})

		rerender({ value: [1, 2] })

		expect(result.current).toBe(first)
	})

	it('gives the new candidate when the content changes, and holds it after', () => {
		const { result, rerender } = renderHook(({ value }) => useStableValue(value, sameItems), {
			initialProps: { value: [1, 2] },
		})

		const next = [1, 3]

		rerender({ value: next })

		expect(result.current).toBe(next)

		rerender({ value: [1, 3] })

		expect(result.current).toBe(next)
	})

	it('does not compare a candidate that is the held value', () => {
		const same = vi.fn(sameItems)

		const value = [1]

		const { rerender } = renderHook(() => useStableValue(value, same))

		rerender()

		expect(same).not.toHaveBeenCalled()
	})

	it('renders one more pass for a change of content, and none for the same content', () => {
		const renders = vi.fn()

		function Probe({ value }: { value: readonly number[] }) {
			renders()

			useStableValue(value, sameItems)

			return null
		}

		const { rerender } = render(<Probe value={[1]} />)

		renders.mockClear()

		rerender(<Probe value={[1]} />)

		expect(renders).toHaveBeenCalledTimes(1)

		renders.mockClear()

		rerender(<Probe value={[2]} />)

		expect(renders).toHaveBeenCalledTimes(2)
	})
})
