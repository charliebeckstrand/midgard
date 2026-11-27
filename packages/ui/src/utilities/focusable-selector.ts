/**
 * Selector for the descendants in the tab order: links with an `href`, enabled
 * form controls, and any element whose `tabindex` is not `-1`.
 *
 * @remarks Reads the `disabled` attribute, not the `:disabled` pseudo-class, so
 * a control disabled only through an ancestor `<fieldset disabled>` still
 * matches. {@link getTabbableElements} also drops that control.
 */
export const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Whether `element` is an unchecked radio of a set that has a checked, enabled
 * radio. Tab skips such a radio, because the checked radio is the Tab stop of
 * its set. A set is the radios of one tree with the same `name` and the same
 * form owner.
 */
function isSkippedRadio(element: HTMLElement): boolean {
	if (!(element instanceof HTMLInputElement)) return false

	if (element.type !== 'radio' || element.checked || !element.name) return false

	// The tree of the radio: its document, its shadow root, or the top of a
	// detached subtree.
	const tree = element.getRootNode() as ParentNode

	for (const other of tree.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
		if (
			other.checked &&
			other.name === element.name &&
			other.form === element.form &&
			!other.matches(':disabled')
		) {
			return true
		}
	}

	return false
}

/**
 * The elements of `root` in the tab order, in document order.
 *
 * @remarks
 * {@link FOCUSABLE_SELECTOR} is the first filter. The filter then drops a
 * control with `tabindex="-1"`, a hidden input, and a control that `:disabled`
 * matches. The last case includes a control that an ancestor
 * `<fieldset disabled>` disables, which the browser also skips. The filter
 * also drops each unchecked radio of a set that has a checked radio, because
 * the checked radio is the Tab stop of the set.
 *
 * `querySelectorAll` gives the elements in document order, also for a selector
 * list, and a caller reads the first or the last element.
 *
 * @param root - The subtree to walk, or `null` for none.
 * @returns The tabbable elements of `root`, not `root` itself.
 * @internal
 */
export function getTabbableElements(root: Element | null): HTMLElement[] {
	if (!root) return []

	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(element) =>
			!element.matches(':disabled') &&
			element.tabIndex >= 0 &&
			!(element instanceof HTMLInputElement && element.type === 'hidden') &&
			!isSkippedRadio(element),
	)
}
