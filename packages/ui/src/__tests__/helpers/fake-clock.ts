import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, vi } from 'vitest'

/** The fake clock that a test drives. */
export type FakeClock = {
	/**
	 * Moves the clock forward. It runs the timers that fall due and the
	 * microtasks that they queue, in `act`, so the React commits that follow
	 * are done when the promise resolves.
	 */
	advance(ms: number): Promise<void>

	/** Sets the time of the clock (`vi.setSystemTime`) and runs no timer. */
	set(time: Date | number): void

	/**
	 * A `userEvent` instance on the fake clock (`advanceTimers`). Its own delays
	 * then move the clock and do not wait on a clock that does not move.
	 */
	user: ReturnType<typeof userEvent.setup>
}

/**
 * The `it` of Vitest, with a `clock` fixture. A test that takes `clock` runs
 * on a fake clock from its first line:
 *
 * ```typescript
 * it('dismisses the toast', async ({ clock }) => {
 *   renderUI(<Toast duration={5000} />)
 *
 *   await clock.advance(5000)
 *
 *   expect(screen.queryByRole('status')).not.toBeInTheDocument()
 * })
 * ```
 *
 * A test that does not take `clock` runs on the real clock, as with the `it`
 * of Vitest.
 *
 * Behavior that depends on time (a debounce, a toast that closes, a hold to
 * confirm) gives the same result on each machine only when the test moves the
 * clock. A test that waits on the real clock can fail on a slow CI agent.
 *
 * The fixture does not install the real clock again. The setups do that after
 * each test, after the spies (`restore-test-state.ts`), also when a test fails
 * or times out.
 */
export const it = test.extend('clock', async ({ onTestFinished }): Promise<FakeClock> => {
	vi.useFakeTimers()

	// The `act` of RTL waits on a timeout of zero, and it moves the clock for
	// that timeout only when it finds a `jest` global. Without this shim, each
	// `clock.user` call waits on the fake clock and never ends.
	const host = globalThis as { jest?: { advanceTimersByTime: (ms: number) => void } }

	const jest = host.jest

	host.jest = { advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms) }

	onTestFinished(() => {
		if (jest === undefined) delete host.jest
		else host.jest = jest
	})

	return {
		advance: (ms) =>
			act(async () => {
				await vi.advanceTimersByTimeAsync(ms)
			}),
		set: (time) => {
			vi.setSystemTime(time)
		},
		user: userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }),
	}
})
