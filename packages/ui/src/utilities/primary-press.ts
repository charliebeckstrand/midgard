/** The subset of a pointer press that {@link isPrimaryPress} reads. */
type Press = Pick<PointerEvent, 'isPrimary' | 'button' | 'ctrlKey'>

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
	return event.isPrimary && event.button === 0 && !event.ctrlKey
}
