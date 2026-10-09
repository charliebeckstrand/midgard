/**
 * The subset of a press that {@link isPrimaryPress} reads. A `MouseEvent` has no `isPrimary`, and
 * the browser sends the mouse events only for the primary pointer, so the field is optional.
 */
type Press = Pick<PointerEvent, 'button' | 'ctrlKey'> & Partial<Pick<PointerEvent, 'isPrimary'>>

/**
 * Whether a press can start a gesture: the primary pointer, the primary button, and no Ctrl.
 *
 * On macOS a Ctrl-click is the secondary click: it sends `button === 0` with `ctrlKey`, and it
 * opens a context menu. The menu can take the release, so a gesture that the press starts stays
 * live with no pointer down. The check refuses Ctrl on every platform, so no platform sniff is
 * necessary.
 *
 * @internal
 */
export function isPrimaryPress(event: Press): boolean {
	return event.isPrimary !== false && event.button === 0 && !event.ctrlKey
}
