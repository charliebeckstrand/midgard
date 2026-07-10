/** The subset of a `contextmenu` mouse event the native-menu escape hatch reads. */
type ContextMenuEscape = Pick<MouseEvent, 'ctrlKey' | 'button'>

/**
 * Whether a `contextmenu` event asks for the browser's native menu instead of a
 * custom one. Ctrl + a secondary-button click (`button === 2`) is the escape
 * hatch, on every platform. A Ctrl + primary-button click (`button === 0`) —
 * macOS's synthesized secondary click — is *not* the escape hatch, so Mac users
 * still reach the custom menu without a right button (CONT-04). The two only
 * differ by button, not platform, so no platform sniff is needed.
 *
 * Callers must yield before calling `preventDefault`: suppressing the native
 * menu and then returning would defeat the escape hatch.
 *
 * @internal
 */
export function isNativeContextMenuRequest(event: ContextMenuEscape): boolean {
	return event.ctrlKey && event.button === 2
}
