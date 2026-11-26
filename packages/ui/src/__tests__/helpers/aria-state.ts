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

	/**
	 * Asserts that `aria-pressed` of the received element is `"false"`: a toggle
	 * button that is off. An element with no `aria-pressed` fails, because
	 * assistive tech then reads no toggle at all. Use it in place of
	 * `not.toBePressed`, which passes when the attribute is absent.
	 *
	 * @throws Under `not`. Use `toBePressed` for the on state, and
	 * `not.toHaveAttribute('aria-pressed')` for an element that is no toggle.
	 */
	toBeUnpressed: () => R

	/**
	 * Asserts that the received element is not checked: a native checkbox or
	 * radio whose `checked` is false, or an element whose `aria-checked` is
	 * `"false"`. An element with no checked state fails. Use it in place of
	 * `not.toBeChecked`, which passes when the element has no checked state.
	 *
	 * @throws Under `not`. Use `toBeChecked` for the on state.
	 */
	toBeUnchecked: () => R
}

declare module 'vitest' {
	interface Matchers<R, T> extends AriaStateMatchers<R> {}
}

function toElement(received: unknown): Element {
	if (!(received instanceof Element)) {
		throw new TypeError(`expected an element, received ${String(received)}`)
	}

	return received
}

/**
 * Reads an ARIA state that has three values: true, false, and absent. Under
 * `not`, an absent value passes as the other state, so each matcher of the
 * pair refuses `not`.
 */
function tristate(
	state: MatcherState,
	name: string,
	received: unknown,
	attribute: string,
	want: 'true' | 'false',
): MatcherResult {
	if (state.isNot) {
		throw new Error(
			`use the other matcher of the pair, not "not.${name}": ${attribute} has three states (true, false, absent)`,
		)
	}

	const element = toElement(received)

	const value = element.getAttribute(attribute)

	return {
		pass: value === want,
		message: () =>
			`expected ${attribute} of ${describeNode(element)} to be "${want}"; it is ${value === null ? 'absent' : `"${value}"`}`,
	}
}

function toBeExpanded(this: MatcherState, received: unknown): MatcherResult {
	return tristate(this, 'toBeExpanded', received, 'aria-expanded', 'true')
}

function toBeCollapsed(this: MatcherState, received: unknown): MatcherResult {
	return tristate(this, 'toBeCollapsed', received, 'aria-expanded', 'false')
}

function toBeUnpressed(this: MatcherState, received: unknown): MatcherResult {
	return tristate(this, 'toBeUnpressed', received, 'aria-pressed', 'false')
}

function toBeUnchecked(this: MatcherState, received: unknown): MatcherResult {
	const element = toElement(received)

	if (
		element instanceof HTMLInputElement &&
		(element.type === 'checkbox' || element.type === 'radio')
	) {
		if (this.isNot) {
			throw new Error('use toBeChecked, not "not.toBeUnchecked"')
		}

		return {
			pass: !element.checked,
			message: () => `expected ${describeNode(element)} to be unchecked; it is checked`,
		}
	}

	return tristate(this, 'toBeUnchecked', element, 'aria-checked', 'false')
}

/**
 * The matchers of the ARIA state that jest-dom does not have. `setup/aria.ts`
 * gives them to `expect` in each project that runs the `ui` tests.
 */
export const ariaStateMatchers = { toBeExpanded, toBeCollapsed, toBeUnpressed, toBeUnchecked }
