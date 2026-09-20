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
 * @param container - The subtree to search.
 * @param name - The `data-slot` value.
 * @returns The first match.
 * @throws If nothing matches.
 */
export function getSlot(container: HTMLElement, name: string) {
	return present(bySlot(container, name), `[data-slot="${name}"]`)
}
