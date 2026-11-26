import type { MatcherResult, MatcherState } from 'vitest'
import { describeNode } from './describe-node'

type AriaStateMatchers<R = unknown> = {
	/**
	 * Asserts that `aria-expanded` of the received element is `"true"`.
	 *
	 * @throws Under `not`. A disclosure that is not open is collapsed: use
	 * `toBeCollapsed`. An element that is no disclosure has no `aria-expanded`:
	 * use `not.toHaveAttribute('aria-expanded')`.
	 */
	toBeExpanded: () => R

	/**
	 * Asserts that `aria-expanded` of the received element is `"false"`. An
	 * element with no `aria-expanded` fails, because assistive tech then reads
	 * no disclosure at all.
	 *
	 * @throws Under `not`, for the reason that `toBeExpanded` gives.
	 */
	toBeCollapsed: () => R
}

declare module 'vitest' {
	interface Matchers<R, T> extends AriaStateMatchers<R> {}
}

function expanded(state: MatcherState, received: unknown, want: 'true' | 'false'): MatcherResult {
	const name = want === 'true' ? 'toBeExpanded' : 'toBeCollapsed'

	if (state.isNot) {
		throw new Error(
			`use the other matcher of the pair, not "not.${name}": aria-expanded has three states (true, false, absent)`,
		)
	}

	if (!(received instanceof Element)) {
		throw new TypeError(`expected an element, received ${String(received)}`)
	}

	const value = received.getAttribute('aria-expanded')

	return {
		pass: value === want,
		message: () =>
			`expected aria-expanded of ${describeNode(received)} to be "${want}"; it is ${value === null ? 'absent' : `"${value}"`}`,
	}
}

function toBeExpanded(this: MatcherState, received: unknown): MatcherResult {
	return expanded(this, received, 'true')
}

function toBeCollapsed(this: MatcherState, received: unknown): MatcherResult {
	return expanded(this, received, 'false')
}

/**
 * The matchers of the ARIA state that jest-dom does not have. `setup/aria.ts`
 * gives them to `expect` in each project that runs the `ui` tests.
 */
export const ariaStateMatchers = { toBeExpanded, toBeCollapsed }
