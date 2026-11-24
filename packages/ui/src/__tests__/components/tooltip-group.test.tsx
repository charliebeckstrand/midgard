import { describe, expect, it, vi } from 'vitest'
import { createTooltipGroup } from '../../components/tooltip/tooltip-group'

describe('createTooltipGroup', () => {
	it('is warm while a tooltip is open and for the grace period after the close', () => {
		vi.useFakeTimers()

		try {
			const group = createTooltipGroup(() => 300)

			const onChange = vi.fn()

			group.subscribe(onChange)

			expect(group.warm()).toBe(false)

			const close = group.open(vi.fn())

			expect(group.warm()).toBe(true)

			close()

			vi.advanceTimersByTime(299)

			expect(group.warm()).toBe(true)

			vi.advanceTimersByTime(1)

			expect(group.warm()).toBe(false)

			// One call for each change of `warm`.
			expect(onChange).toHaveBeenCalledTimes(2)
		} finally {
			vi.useRealTimers()
		}
	})

	it('hands over from the open tooltip to the next, and the old close starts no grace period', () => {
		vi.useFakeTimers()

		try {
			const group = createTooltipGroup(() => 300)

			const first = vi.fn()

			const closeFirst = group.open(first)

			const closeSecond = group.open(vi.fn())

			expect(first).toHaveBeenCalledOnce()

			// The close of the first tooltip comes after the handover.
			closeFirst()

			vi.advanceTimersByTime(1000)

			expect(group.warm()).toBe(true)

			closeSecond()

			vi.advanceTimersByTime(300)

			expect(group.warm()).toBe(false)
		} finally {
			vi.useRealTimers()
		}
	})

	it('keeps warm when a tooltip opens in the grace period', () => {
		vi.useFakeTimers()

		try {
			const group = createTooltipGroup(() => 300)

			group.open(vi.fn())()

			vi.advanceTimersByTime(200)

			group.open(vi.fn())

			vi.advanceTimersByTime(1000)

			expect(group.warm()).toBe(true)
		} finally {
			vi.useRealTimers()
		}
	})
})
