import { inject } from 'vitest'

/**
 * Wall-clock budgets for the browser suite, scaled for the machine.
 *
 * `vitest.config.ts` states the rule these follow: machine speed must change
 * when a test passes, never whether it passes. RTL's `waitFor` budget obeys it
 * through `asyncUtilTimeout`, which `vitest.browser.config.ts` provides and
 * `browser/setup/index.ts` injects. A literal in a test body obeys nothing.
 *
 * Two shapes need one. A settle wait holds for a component's own timer before a
 * positive assertion, and too short a hold fails a sound case on a loaded
 * agent. A quiet wait holds past the point where something would have happened
 * and then asserts it did not — and too short a hold there is worse than a
 * flake, because the case passes for the wrong reason and asserts nothing. The
 * tooltip cases carry the clearest example: they hold 400ms against a 250ms
 * hover delay, which leaves 150ms of headroom on the suite's most loaded page.
 *
 * The factor is provided beside `asyncUtilTimeout` so one decision governs
 * both. It is 1 locally and 2 on CI, where the jsdom budget takes 4: a `waitFor`
 * budget bounds a failure and can be generous, while these hold real time on
 * every green run, so the same multiplier would cost the suite about 3 seconds
 * a run to buy nothing.
 */

/** The machine's slowness factor: 1 on a dev machine, more on a shared agent. */
function factor(): number {
	return inject('slowFactor')
}

/**
 * Scale a `waitFor` budget for the machine.
 *
 * Use it for a case that needs longer than the suite-wide `asyncUtilTimeout` —
 * a real network double, or rows behind a real timer. The result stays well
 * under `testTimeout`, so an exhausted wait still fails as an RTL timeout
 * carrying the callback's last error.
 *
 * @param ms - The budget a dev machine needs.
 * @returns The budget this machine needs.
 */
export function budget(ms: number): number {
	return ms * factor()
}

/**
 * Hold for `ms` of real time, scaled for the machine.
 *
 * Use it where no signal marks the moment the case waits for: a component's own
 * delay must expire, or a frame must land, before the assertion can mean
 * anything. Prefer `waitFor` on an observable wherever one exists — a hold
 * spends its time on every green run, and `waitFor` returns as soon as the
 * condition is true.
 *
 * @param ms - The hold a dev machine needs.
 * @returns A promise that settles after the scaled hold.
 */
export function pause(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms * factor())
	})
}
