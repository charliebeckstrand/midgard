import { inject } from 'vitest'
import { frames } from '../../helpers/frames'

/**
 * Scale a `waitFor` budget for the machine.
 *
 * `vitest.config.ts` states the rule: machine speed must change when a test
 * passes, never whether it passes. RTL's suite-wide budget obeys it through
 * `asyncUtilTimeout`; a per-call override written as a literal obeys nothing.
 * Use this for a case that needs longer than the suite budget — a real network
 * double, or rows behind a real timer. Keep the result under the timeout of
 * the case, so an exhausted wait still fails as an RTL timeout carrying the
 * callback's last error. The suite `testTimeout` is 15s on a dev machine, and
 * it scales by the same factor. A case whose budget can pass it sets its own
 * timeout, also through `budget`.
 *
 * @param ms - The budget a dev machine needs.
 * @returns The budget this machine needs.
 */
export function budget(ms: number): number {
	return ms * inject('budgetFactor')
}

/**
 * Hold for `ms` of real time, and then for two animation frames.
 *
 * Use it where no signal marks the moment the case waits for: a component's own
 * delay must expire before "nothing happened" means anything. Prefer `waitFor`
 * on an observable wherever one exists, and `frames()` where the wait is for
 * the browser to deliver a measurement — a hold spends its whole value on every
 * green run, where both of those return as soon as the state is real.
 *
 * Start the hold after the event that starts the delay. The hold then ends
 * after the timer of the component, because a timer that started earlier with
 * the same or a shorter timeout runs first. The two frames then let the work
 * that the timer started commit and paint, and let a `ResizeObserver` deliver.
 * Under load, one frame can take longer than `ms`. Without the frames, the
 * case can look before the browser delivers anything, and a regression passes.
 *
 * Deliberately unscaled, unlike {@link budget}. The delay a hold outlasts is a
 * `setTimeout` in the component, which fires on wall clock and does not stretch
 * with CPU load, so a factor would buy no headroom. It would cost 4.1s of sleep
 * on every green CI run at a factor of 2.
 *
 * @param ms - The hold.
 * @returns A promise that settles after the hold and the two frames.
 */
export async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms)
	})

	await frames()
}
