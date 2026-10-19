import { act } from '@testing-library/react'
import { test, vi } from 'vitest'
import { setupUser } from './setup-user'

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
	 * A `userEvent` instance with no pause between the events that it sends
	 * (`setupUser`). A wait that it still makes moves the fake clock
	 * (`advanceTimers`), so the call does not wait on a clock that does not move.
	 */
	user: ReturnType<typeof setupUser>
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
export const it = test.extend('clock', async (): Promise<FakeClock> => {
	vi.useFakeTimers()

	// The `act` of RTL waits on a timeout of zero, and it moves the clock for
	// that timeout only when it finds a `jest` global. Without this stub, each
	// `clock.user` call waits on the fake clock and never ends. The setups remove
	// the stub after the test (`unstubAllGlobals`).
	vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })

	return {
		advance: (ms) =>
			act(async () => {
				await vi.advanceTimersByTimeAsync(ms)
			}),
		set: (time) => {
			vi.setSystemTime(time)
		},
		user: setupUser({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }),
	}
})
