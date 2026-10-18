/**
 * The subset of an event that {@link hasBrowserModifier} reads. React and DOM events both fit, and a
 * mouse event fits too.
 */
type ModifierPress = Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>

/**
 * Whether a key press or a click holds Ctrl, Meta, or Alt.
 *
 * Such a chord is for the browser, such as its page zoom, its history, or a new tab for a link. A
 * handler must not take it. Shift is not in the test, because `+` and other keys need it. A caller
 * that also refuses Shift adds `event.shiftKey` to the test.
 *
 * @internal
 */
export function hasBrowserModifier(event: ModifierPress): boolean {
	return event.ctrlKey || event.metaKey || event.altKey
}
