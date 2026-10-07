/**
 * Whether the floating reference is disabled. The reference node matches
 * `:disabled`, where the trigger is cloned onto a `<button>` switched off by
 * its own `disabled` attribute or an ancestor `<fieldset disabled>`. A
 * disabled control can also sit inside it (the wrapper-`<div>` fallback).
 * `querySelector` scans descendants only; `matches` covers the
 * reference-is-the-control case.
 * @internal
 */
export function isReferenceDisabled(reference: unknown): boolean {
	return (
		reference instanceof Element &&
		(reference.matches(':disabled') || reference.querySelector(':disabled') !== null)
	)
}

/**
 * The `<fieldset>` ancestors of `reference`, nearest first. A `disabled` change
 * on any of them changes whether the reference matches `:disabled`.
 */
function fieldsetAncestors(reference: Element): Element[] {
	const fieldsets: Element[] = []

	for (let node = reference.parentElement?.closest('fieldset'); node; ) {
		fieldsets.push(node)

		node = node.parentElement?.closest('fieldset')
	}

	return fieldsets
}

/**
 * Calls `onChange` when a `disabled` attribute changes on `reference`, on a
 * node inside it, or on a `<fieldset>` ancestor. Each of them can change
 * whether the reference matches `:disabled`, and none of them is a React
 * signal.
 *
 * @returns A function that stops the observer.
 * @internal
 */
export function observeReferenceDisabled(reference: Element, onChange: () => void): () => void {
	const observer = new MutationObserver(onChange)

	const watch = { attributes: true, attributeFilter: ['disabled'] }

	observer.observe(reference, { ...watch, subtree: true })

	for (const fieldset of fieldsetAncestors(reference)) observer.observe(fieldset, watch)

	return () => observer.disconnect()
}
