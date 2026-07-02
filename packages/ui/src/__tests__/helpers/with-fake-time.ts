import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onTestFinished, vi } from 'vitest'

type FakeClock = {
	/**
	 * Advances the fake clock, flushing elapsed timers and any microtasks they
	 * queue, wrapped in `act` so resulting React commits settle before the
	 * promise resolves.
	 */
	advance(ms: number): Promise<void>

	/**
	 * A `userEvent` instance wired to the fake clock via `advanceTimers`, so
	 * built-in event delays drive fake timers instead of stalling against a
	 * clock that never ticks.
	 */
	user: ReturnType<typeof userEvent.setup>
}

/**
 * Runs `run` under fake timers and always restores real ones, even on a
 * failing assertion.
 *
 * @remarks
 * Time-driven behaviour (debounce, toast dismissal, hold-to-confirm) is
 * deterministic only when the test drives the clock instead of racing it:
 * `clock.advance` moves time explicitly, so machine speed can't change the
 * outcome. Waiting on real time (`waitFor` on a timer, real sleeps) is what
 * flakes on loaded CI agents.
 *
 * @param run - Test body; receives the {@link FakeClock} driving the test.
 *
 * @example
 * ```typescript
 * await withFakeTime(async (clock) => {
 *   renderUI(<Toast duration={5000} />)
 *
 *   await clock.advance(5000)
 *
 *   expect(screen.queryByRole('status')).not.toBeInTheDocument()
 * })
 * ```
 */
export async function withFakeTime(run: (clock: FakeClock) => Promise<void> | void): Promise<void> {
	vi.useFakeTimers()

	// RTL's act asyncWrapper settles through a zero-delay timeout that it only
	// advances when it detects a `jest` global; without this shim every
	// `clock.user` interaction deadlocks against the fake clock.
	const globalWithJest = globalThis as { jest?: { advanceTimersByTime: (ms: number) => void } }

	const priorJest = globalWithJest.jest

	globalWithJest.jest = { advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms) }

	let restored = false

	const restore = () => {
		if (restored) {
			return
		}

		restored = true

		if (priorJest === undefined) {
			delete globalWithJest.jest
		} else {
			globalWithJest.jest = priorJest
		}

		vi.useRealTimers()
	}

	// A test aborted by testTimeout leaves `run` hanging, so the finally below
	// never executes; the runner still settles the task and calls this hook,
	// keeping the leaked fake clock from cascading into the file's later tests.
	onTestFinished(restore)

	try {
		await run({
			advance: (ms) =>
				act(async () => {
					await vi.advanceTimersByTimeAsync(ms)
				}),
			user: userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }),
		})
	} finally {
		restore()
	}
}
