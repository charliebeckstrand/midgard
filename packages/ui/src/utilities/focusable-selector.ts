/**
 * Selector for the descendants in the tab order: links with an `href`, enabled
 * form controls, and any element whose `tabindex` is not `-1`.
 *
 * @remarks Reads the `disabled` attribute, not the `:disabled` pseudo-class, so
 * a control disabled only through an ancestor `<fieldset disabled>` still
 * matches. {@link tabbablesIn} also drops that control.
 */
export const FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * The elements of `root` in the tab order, in document order.
 *
 * @remarks
 * {@link FOCUSABLE_SELECTOR} is the first filter. The walk then drops a control
 * with `tabindex="-1"`, a hidden input, and a control that `:disabled` matches.
 * The last case includes a control that an ancestor `<fieldset disabled>`
 * disables, which the browser also skips.
 *
 * The walk matches each element in turn. The result of `querySelectorAll` with a
 * selector list is not in document order in jsdom, and a caller reads the first
 * or the last element.
 *
 * @param root - The subtree to walk, or `null` for none.
 * @returns The tabbable elements of `root`, not `root` itself.
 * @internal
 */
export function tabbablesIn(root: Element | null): HTMLElement[] {
	if (!root) return []

	return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
		(element) =>
			element.matches(FOCUSABLE_SELECTOR) &&
			!element.matches(':disabled') &&
			element.tabIndex >= 0 &&
			!(element instanceof HTMLInputElement && element.type === 'hidden'),
	)
}
