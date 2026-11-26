import type { MatcherResult } from 'vitest'
import { describeNode } from './describe-node'

/** An element that a test expects an attribute to name. `null` and `undefined` are refused. */
type Target = Element | null | undefined

type AriaMatchers<R = unknown> = {
	/**
	 * Asserts that `aria-controls` of the received element names `targets`, in
	 * order, and that each id names one element only. A failure names each
	 * element that the attribute names.
	 *
	 * @throws When a target is not an element, so that a query that found
	 * nothing does not make the check pass.
	 */
	toControl: (...targets: Target[]) => R

	/**
	 * Asserts that `aria-activedescendant` of the received element names
	 * `target`, and that its id names one element only.
	 *
	 * @throws When `target` is not an element.
	 */
	toHaveActiveDescendant: (target: Target) => R

	/**
	 * Asserts that `aria-labelledby` of the received element names `targets`,
	 * in order, and that each id names one element only.
	 *
	 * @throws When a target is not an element.
	 */
	toBeLabelledBy: (...targets: Target[]) => R

	/**
	 * Asserts that `aria-describedby` of the received element names `targets`,
	 * in order, and that each id names one element only.
	 *
	 * @throws When a target is not an element.
	 */
	toBeDescribedBy: (...targets: Target[]) => R
}

declare module 'vitest' {
	interface Matchers<R, T> extends AriaMatchers<R> {}
}

function toElement(value: unknown, role: string): Element {
	if (!(value instanceof Element)) {
		throw new TypeError(`expected ${role} to be an element, received ${String(value)}`)
	}

	return value
}

/**
 * The elements with `id` in the tree of `from`: its document, its shadow root,
 * or the detached tree of a server render.
 */
function elementsWithId(from: Element, id: string): Element[] {
	const root = from.getRootNode()

	const selector = `[id="${id.replace(/["\\]/g, '\\$&')}"]`

	const found = [...(root as ParentNode).querySelectorAll(selector)]

	return root instanceof Element && root.id === id ? [root, ...found] : found
}

/** Describes one id token: the element that it names, or why it names none. */
function describeToken(from: Element, id: string): string {
	const found = elementsWithId(from, id)

	if (found.length === 0) return `"${id}" (no element)`

	if (found.length > 1) return `"${id}" (${found.length} elements)`

	return `"${id}" (${describeNode(found[0] ?? null)})`
}

/** The id-reference attributes of ARIA that the helpers of this file read. */
export type IdReference =
	| 'aria-controls'
	| 'aria-activedescendant'
	| 'aria-labelledby'
	| 'aria-describedby'
	| 'aria-owns'

/**
 * Returns the ids in `attribute` of `element`. `aria-activedescendant` takes
 * one id, not a list. An HTML id has no whitespace, and a browser does not trim
 * the value. Thus a value with whitespace at any position is wrong, whatever
 * the case expects.
 *
 * @throws When `aria-activedescendant` has whitespace, also under `not`.
 */
function idTokens(element: Element, attribute: IdReference): string[] {
	const value = element.getAttribute(attribute) ?? ''

	if (attribute === 'aria-activedescendant' && /\s/.test(value)) {
		throw new Error(
			`expected ${attribute} of ${describeNode(element)} to be one id; "${value}" has whitespace`,
		)
	}

	return value.split(/\s+/).filter(Boolean)
}

/**
 * Returns the elements that `attribute` of `element` names, one for each id,
 * in order. Use it to read the named element. To prove which element the
 * attribute names, use a matcher such as `toControl`.
 *
 * @throws When the attribute is absent or empty, or when an id names no
 * element or more than one element.
 */
export function ariaTargets(element: Element, attribute: IdReference): HTMLElement[] {
	const tokens = idTokens(element, attribute)

	if (tokens.length === 0) {
		throw new Error(`expected ${describeNode(element)} to have ${attribute}`)
	}

	return tokens.map((id) => {
		const found = elementsWithId(element, id)

		if (found.length !== 1 || !(found[0] instanceof HTMLElement)) {
			throw new Error(
				`${attribute} of ${describeNode(element)} names ${describeToken(element, id)}`,
			)
		}

		return found[0]
	})
}

/**
 * Returns the one element that `attribute` of `element` names.
 *
 * @throws When the attribute does not name exactly one element.
 */
export function ariaTarget(element: Element, attribute: IdReference): HTMLElement {
	const targets = ariaTargets(element, attribute)

	if (targets.length !== 1) {
		throw new Error(
			`expected ${attribute} of ${describeNode(element)} to name one element, it names ${targets.length}`,
		)
	}

	return targets[0] as HTMLElement
}

function references(
	attribute: IdReference,
	received: unknown,
	targets: readonly unknown[],
): MatcherResult {
	const subject = toElement(received, 'the received value')

	if (targets.length === 0) throw new TypeError('expected at least one target element')

	const expected = targets.map((target, index) => toElement(target, `target ${index + 1}`))

	const tokens = idTokens(subject, attribute)

	const pass =
		tokens.length === expected.length &&
		tokens.every((id, index) => {
			const found = elementsWithId(subject, id)

			return found.length === 1 && found[0] === expected[index]
		})

	const names =
		tokens.length === 0
			? `no ${attribute}`
			: tokens.map((id) => describeToken(subject, id)).join(', ')

	const wanted = expected.map((element) => describeNode(element)).join(', ')

	return {
		pass,
		message: () =>
			`expected ${attribute} of ${describeNode(subject)} ${pass ? 'not ' : ''}to name ${wanted}; it names ${names}`,
	}
}

function toControl(received: unknown, ...targets: unknown[]): MatcherResult {
	return references('aria-controls', received, targets)
}

function toHaveActiveDescendant(received: unknown, target: unknown): MatcherResult {
	return references('aria-activedescendant', received, [target])
}

function toBeLabelledBy(received: unknown, ...targets: unknown[]): MatcherResult {
	return references('aria-labelledby', received, targets)
}

function toBeDescribedBy(received: unknown, ...targets: unknown[]): MatcherResult {
	return references('aria-describedby', received, targets)
}

/**
 * The matchers of the id references of ARIA. `setup/aria.ts` gives them to
 * `expect` in each project that runs the `ui` tests.
 */
export const ariaMatchers = { toControl, toHaveActiveDescendant, toBeLabelledBy, toBeDescribedBy }
