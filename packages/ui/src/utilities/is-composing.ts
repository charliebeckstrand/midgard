/**
 * The fields of a keyboard event that {@link isComposing} reads: a React event
 * gives the flag on `nativeEvent`, and a DOM event gives it on the event.
 */
type ComposingKeyEvent = { keyCode: number } & (
	| { nativeEvent: { isComposing: boolean } }
	| { isComposing: boolean }
)

/**
 * Whether an input method composes the key press.
 *
 * The key that starts a composition reports `keyCode` 229 before `isComposing`
 * becomes true. Safari also reports 229 on the Enter that confirms a candidate,
 * with `isComposing` false. So both signals count. The function accepts a React
 * keyboard event or a DOM `KeyboardEvent`.
 */
export function isComposing(event: ComposingKeyEvent): boolean {
	const flag = 'nativeEvent' in event ? event.nativeEvent.isComposing : event.isComposing

	return flag || event.keyCode === 229
}
