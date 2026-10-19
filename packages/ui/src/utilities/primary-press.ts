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

/**
 * The one pointer that a gesture follows, from the press that starts it to its end.
 *
 * Pointer Events mark `isPrimary` for each pointer type. While a pen or a mouse drags, the first
 * touch of a resting palm is primary too, so {@link isPrimaryPress} alone lets the palm start the
 * gesture again or take it. The owner refuses a press while a pointer holds the gesture, and reads
 * only the events of that pointer. A mouse event carries no `pointerId`, so a press from one holds
 * the gesture with no id, and only the release frees it.
 *
 * @internal
 */
export type PressOwner = {
	/** Takes the gesture for a primary press while no pointer holds it. Whether it took the gesture. */
	claim: (event: Press & { pointerId?: number }) => boolean
	/** Whether a pointer holds the gesture. */
	held: () => boolean
	/** Whether `event` comes from the pointer that holds the gesture. */
	owns: (event: { pointerId: number }) => boolean
	/** Frees the gesture. */
	release: () => void
}

/** A pointer with no id: the press was a mouse event. */
const NO_POINTER_ID = -1

/**
 * Makes a {@link PressOwner}. A hook keeps one for its gesture, for example with
 * `useState(createPressOwner)`.
 *
 * @internal
 */
export function createPressOwner(): PressOwner {
	let pointer: number | null = null

	return {
		claim: (event) => {
			if (pointer !== null || !isPrimaryPress(event)) return false

			pointer = event.pointerId ?? NO_POINTER_ID

			return true
		},
		held: () => pointer !== null,
		owns: (event) => pointer !== null && event.pointerId === pointer,
		release: () => {
			pointer = null
		},
	}
}
