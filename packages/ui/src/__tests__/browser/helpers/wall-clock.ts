import { inject } from 'vitest'

/**
 * Scale a `waitFor` budget for the machine.
 *
 * `vitest.config.ts` states the rule: machine speed must change when a test
 * passes, never whether it passes. RTL's suite-wide budget obeys it through
 * `asyncUtilTimeout`; a per-call override written as a literal obeys nothing.
 * Use this for a case that needs longer than the suite budget — a real network
 * double, or rows behind a real timer. The result stays well under
 * `testTimeout`, so an exhausted wait still fails as an RTL timeout carrying
 * the callback's last error.
 *
 * @param ms - The budget a dev machine needs.
 * @returns The budget this machine needs.
 */
export function budget(ms: number): number {
	return ms * inject('budgetFactor')
}

/**
 * Hold for `ms` of real time.
 *
 * Use it where no signal marks the moment the case waits for: a component's own
 * delay must expire before "nothing happened" means anything. Prefer `waitFor`
 * on an observable wherever one exists, and `frames()` where the wait is for
 * the browser to deliver a measurement — a hold spends its whole value on every
 * green run, where both of those return as soon as the state is real.
 *
 * Deliberately unscaled, unlike {@link budget}. The delay a hold outlasts is a
 * `setTimeout` in the component, which fires on wall clock and does not stretch
 * with CPU load, so a factor would buy no headroom. It would cost 4.1s of sleep
 * on every green CI run at a factor of 2.
 *
 * @param ms - The hold.
 * @returns A promise that settles after it.
 */
export function pause(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}
