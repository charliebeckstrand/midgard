import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import type { ToastData } from '../../components/toast/types'
import { useToastTimer } from '../../components/toast/use-toast-timer'
import { it, onFakeClock } from '../helpers/fake-clock'

function makeToast(id: string): ToastData {
	return { id, title: id, duration: 1000 }
}

function setup(ids: string[] = ['a']) {
	const start = vi.fn()

	const stop = vi.fn()

	const toastsRef = { current: ids.map(makeToast) }

	const { result } = renderHook(() => useToastTimer(toastsRef, start, stop))

	return { result, start, stop, toastsRef }
}

describe('useToastTimer', () => {
	onFakeClock()

	it('fires start with the toast id when its duration elapses', async ({ clock }) => {
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

		await clock.advance(999)

		expect(start).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a'])
	})

	it('counts each toast down on its own duration', async ({ clock }) => {
		const { result, start } = setup(['long', 'short'])

		act(() => result.current.arm('long', 10000))

		await clock.advance(1000)

		// A later, shorter toast must not move the deadline of the earlier toast.
		act(() => result.current.arm('short', 1000))

		await clock.advance(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['short'])

		await clock.advance(7999)

		expect(start).toHaveBeenCalledOnce()

		await clock.advance(1)

		expect(start).toHaveBeenLastCalledWith(['long'])
	})

	it('gives the toasts that expire together to start in list order', async ({ clock }) => {
		const { result, start } = setup(['a', 'b'])

		act(() => {
			result.current.arm('b', 1000)

			result.current.arm('a', 1000)
		})

		await clock.advance(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a', 'b'])
	})

	it('drops the countdown of a toast that leaves by another route', async ({ clock }) => {
		const { result, start, toastsRef } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 500)

			result.current.arm('b', 1000)
		})

		toastsRef.current = toastsRef.current.filter((t) => t.id !== 'a')

		await clock.advance(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['b'])
	})

	it('restarts the countdown of one toast on a reset', async ({ clock }) => {
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

		await clock.advance(800)

		act(() => result.current.arm('a', 1000))

		await clock.advance(999)

		expect(start).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(start).toHaveBeenCalledOnce()
	})

	it('pauses every countdown, and resumes each from its own remaining time', async ({ clock }) => {
		const { result, start, stop } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 1000)

			result.current.arm('b', 2000)
		})

		await clock.advance(300)

		act(() => result.current.pause())

		expect(stop).toHaveBeenCalledOnce()

		await clock.advance(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		// 700 ms remain for `a` and 1700 ms for `b`.
		await clock.advance(699)

		expect(start).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a'])

		await clock.advance(1000)

		expect(start).toHaveBeenLastCalledWith(['b'])
	})

	it('queues again, on resume, a toast whose time was up when the hold started', async ({
		clock,
	}) => {
		const { result, start, toastsRef } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 1000)

			result.current.arm('b', 1000)
		})

		await clock.advance(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a', 'b'])

		// The queue removed `a` only. The hold empties the queue before `b` leaves.
		toastsRef.current = toastsRef.current.filter((t) => t.id !== 'a')

		act(() => result.current.pause())

		await clock.advance(5000)

		expect(start).toHaveBeenCalledOnce()

		act(() => result.current.resume())

		await clock.advance(0)

		expect(start).toHaveBeenLastCalledWith(['b'])
	})

	it('does not collapse the remaining time across paired holds (hover + focus)', async ({
		clock,
	}) => {
		// Guards the deepened-hold path: a second pause() must not subtract
		// elapsed time again, which would collapse remaining time to ~0 and
		// auto-dismiss the toast mid-interaction.
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

		await clock.advance(300)

		// Hover hold, then focus hold with no intervening release.
		act(() => result.current.pause())

		act(() => result.current.pause())

		// One release (focus leaves): the remaining hover hold keeps the timer frozen.
		act(() => result.current.resume())

		await clock.advance(5000)

		expect(start).not.toHaveBeenCalled()

		// The final release re-arms with the un-collapsed 700ms remaining.
		act(() => result.current.resume())

		await clock.advance(699)

		expect(start).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(start).toHaveBeenCalledOnce()
	})

	it('keeps a toast raised under a hold frozen until the final release', async ({ clock }) => {
		const { result, start } = setup()

		act(() => result.current.pause())

		act(() => result.current.arm('a', 1000))

		await clock.advance(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		await clock.advance(1000)

		expect(start).toHaveBeenCalledOnce()
	})

	it('ignores an unpaired resume (the hold count floors at zero)', async ({ clock }) => {
		const { result, start } = setup()

		// A stray release with nothing held must not push the count negative —
		// that would swallow the next hold and let the timer run under it.
		act(() => result.current.resume())

		act(() => result.current.arm('a', 1000))

		await clock.advance(300)

		act(() => result.current.pause())

		await clock.advance(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		await clock.advance(700)

		expect(start).toHaveBeenCalledOnce()
	})

	it.for([Infinity, 2 ** 31 + 1000])(
		'does not loop the timer when a toast holds a duration of %d',
		async (ms, { clock }) => {
			const { result, start, toastsRef } = setup(['long', 'short'])

			const toasts = toastsRef.current

			// Each timer callback reads the list. A spy on the global timer would
			// outlive the fake timers under `restoreMocks`.
			let reads = 0

			Object.defineProperty(toastsRef, 'current', {
				get: () => {
					reads += 1

					return toasts
				},
			})

			act(() => result.current.arm('long', ms))

			reads = 0

			await clock.advance(500)

			// The platform timer holds a delay up to 2^31−1. A longer delay must not
			// fire at once and arm again in a loop.
			expect(reads).toBe(0)

			// A short toast beside the long one still leaves at its time.
			act(() => result.current.arm('short', 1000))

			await clock.advance(1000)

			expect(start).toHaveBeenCalledExactlyOnceWith(['short'])
		},
	)

	it('ends a finite duration above the timer range at its time', async ({ clock }) => {
		const { result, start } = setup()

		act(() => result.current.arm('a', 2 ** 31 + 1000))

		await clock.advance(2 ** 31 + 999)

		expect(start).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a'])
	})

	it('does not fire when no toast counts down', async ({ clock }) => {
		const { result, start } = setup([])

		act(() => result.current.resume())

		await clock.advance(2000)

		expect(start).not.toHaveBeenCalled()
	})
})
