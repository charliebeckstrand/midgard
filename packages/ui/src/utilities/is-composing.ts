/** The fields of a keyboard event that {@link isComposing} reads. */
type ComposingKeyEvent = {
	keyCode: number
	nativeEvent: { isComposing: boolean }
}

/**
 * Whether an input method composes the key press.
 *
 * The key that starts a composition reports `keyCode` 229 before `isComposing`
 * becomes true. Safari also reports 229 on the Enter that confirms a candidate,
 * with `isComposing` false. So both signals count.
 */
export function isComposing(event: ComposingKeyEvent): boolean {
	return event.nativeEvent.isComposing || event.keyCode === 229
}
