/**
 * Clears `input` through the native value setter and a bubbling `input` event,
 * so controlled and uncontrolled consumers both observe the change, then
 * returns focus to it (WCAG 2.4.3) as its clear button unmounts.
 */
export function clearNativeInput(input: HTMLInputElement | null) {
	if (!input) return

	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '')

	input.dispatchEvent(new Event('input', { bubbles: true }))

	input.focus()
}
