/** The subset of a key press that {@link hasBrowserModifier} reads. React and DOM events both fit. */
type ModifierPress = Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>

/**
 * Whether a key press holds Ctrl, Meta, or Alt.
 *
 * Such a chord is for the browser, such as its page zoom or its history, so a handler must not
 * take it. Shift is not in the test, because `+` and other keys need it. A caller that also refuses
 * Shift adds `event.shiftKey` to the test.
 *
 * @internal
 */
export function hasBrowserModifier(event: ModifierPress): boolean {
	return event.ctrlKey || event.metaKey || event.altKey
}
