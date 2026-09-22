import { nonEmpty } from './non-empty'
import { present } from './present'

/**
 * Query a single element by its `data-slot` attribute within a container.
 * Returns `null` when not found, mirroring `querySelector` semantics.
 */
export function bySlot(container: HTMLElement, name: string) {
	return container.querySelector<HTMLElement>(`[data-slot="${name}"]`)
}

/**
 * Query all elements matching a `data-slot` attribute within a container.
 */
export function allBySlot(container: HTMLElement, name: string) {
	return Array.from(container.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`))
}

/**
 * Query a single element by its `data-slot`, and throw when it is absent.
 *
 * The form to reach for. `bySlot` returns `null`, which a caller then either
 * casts away — putting the miss at some later `getBoundingClientRect` — or
 * guards by hand, repeating the slot name as the failure message. This states
 * the name once and reports the miss at the query.
 *
 * Use `bySlot` where absence is the contract, as `expect(bySlot(…)).toBeNull()`
 * asserts, and where the slot has more than one match in the container.
 *
 * The narrowing defaults to `HTMLElement`, as `present` does. A caller reading
 * an interface a slot publishes — an input's `value`, a details element's
 * `open` — names the type instead (`getSlot<HTMLInputElement>(…)`).
 *
 * @param container - The subtree to search.
 * @param name - The `data-slot` value.
 * @returns The first match, narrowed to `T`.
 * @throws If nothing matches.
 */
export function getSlot<T extends HTMLElement = HTMLElement>(
	container: HTMLElement,
	name: string,
): T {
	return present<T>(bySlot(container, name), `[data-slot="${name}"]`)
}

/**
 * Query every element by its `data-slot`, and throw when none matches.
 *
 * Use it where a case asserts on each match and the render does not fix the
 * count. An assertion in a loop over `allBySlot` passes on an empty list, so a
 * renamed slot leaves it green. `getAllSlots` reports that miss at the query.
 *
 * Where the render fixes the count, assert `toHaveLength(n)` on `allBySlot`
 * instead. That check also fails when one match is missing.
 *
 * @param container - The subtree to search.
 * @param name - The `data-slot` value.
 * @returns Every match in document order, narrowed to `T`.
 * @throws If nothing matches.
 */
export function getAllSlots<T extends HTMLElement = HTMLElement>(
	container: HTMLElement,
	name: string,
): [T, ...T[]] {
	const selector = `[data-slot="${name}"]`

	return nonEmpty(container.querySelectorAll<T>(selector), selector)
}
