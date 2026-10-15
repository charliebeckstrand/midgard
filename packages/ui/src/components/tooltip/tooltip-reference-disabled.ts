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
 * Whether a mutation record can change whether `reference` matches
 * `:disabled`. A node added to or removed from `reference` can, and so can a
 * `disabled` change on `reference`, on a node inside it, or on a `<fieldset>`
 * that contains it.
 */
function affectsReference(reference: Element, record: MutationRecord): boolean {
	if (record.type === 'childList') return true

	const target = record.target

	return (
		reference.contains(target) ||
		(target instanceof HTMLFieldSetElement && target.contains(reference))
	)
}

/**
 * Calls `onChange` when a `disabled` attribute changes on `reference`, on a
 * node inside it, or on a `<fieldset>` ancestor. It also calls `onChange` when
 * a node is added to or removed from `reference` or its descendants, because
 * a remount can put a disabled control in place with no attribute change. Each
 * of these changes can change whether the reference matches `:disabled`, and
 * none of them is a React signal.
 *
 * The observer watches the `disabled` attribute in all of the root node of
 * `reference` (the document or a shadow root). It keeps only the records that
 * can change the reference. Thus it also finds a `<fieldset>` that becomes an
 * ancestor after the observer starts. A move does not call `onChange`, so a
 * move into a `<fieldset>` that is already disabled is found only at the next
 * change.
 *
 * @returns A function that stops the observer.
 * @internal
 */
export function observeReferenceDisabled(reference: Element, onChange: () => void): () => void {
	const observer = new MutationObserver((records) => {
		if (records.some((record) => affectsReference(reference, record))) onChange()
	})

	const watch = { attributes: true, attributeFilter: ['disabled'], subtree: true }

	observer.observe(reference, { ...watch, childList: true })

	const root = reference.getRootNode()

	// A second `observe` call on the same node replaces the first options.
	if (root !== reference) observer.observe(root, watch)

	return () => observer.disconnect()
}
