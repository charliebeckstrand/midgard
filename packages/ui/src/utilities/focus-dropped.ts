/**
 * Whether no element holds the focus: `document.activeElement` is null or the body.
 *
 * The focus falls to the body when the browser removes the focused element or disables it. A
 * component that moves the focus after a change uses this test, so that it moves only the focus
 * that the change dropped. Focus that the user moved to another element stays there.
 *
 * @internal
 */
export function focusDropped(): boolean {
	const active = document.activeElement

	return active === null || active === document.body
}
