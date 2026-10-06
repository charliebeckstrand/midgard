/**
 * Time, in ms, that the page keeps text selection off after the last held touch ends. iOS can
 * start the selection of a long press after the finger lifts.
 */
export const TEXT_SELECTION_RELEASE_DELAY = 300

/** The class that turns off text selection on the root element. */
const HOLD = 'select-none'

/** The touches that hold text selection off now. */
const held = new Set<number>()

let release: ReturnType<typeof setTimeout> | undefined

/** Whether the root element had the class before the first hold, so the release keeps it. */
let owned = false

function end(event: PointerEvent) {
	if (!held.delete(event.pointerId) || held.size > 0) return

	window.removeEventListener('pointerup', end, true)

	window.removeEventListener('pointercancel', end, true)

	release = setTimeout(() => {
		release = undefined

		if (owned) document.documentElement.classList.remove(HOLD)

		owned = false
	}, TEXT_SELECTION_RELEASE_DELAY)
}

/**
 * Turns off text selection on the whole page while a touch holds a surface.
 *
 * On iOS, a long press starts a text selection. `select-none` on the held surface stops the
 * selection of the text in the surface, but Safari then selects the nearest text outside it,
 * such as a label below the surface. Only `select-none` on the root element stops that, so a
 * surface that takes the long press calls this function on each `pointerdown`. A touch that is
 * not a hold, such as a tap or a scroll, ends before the selection starts, so it loses nothing.
 * The root element gets selection back {@link TEXT_SELECTION_RELEASE_DELAY} ms after the last
 * held touch ends. Nested surfaces can call this function for the same touch.
 *
 * Prior art: React Aria's `disableTextSelection` does the same on iOS.
 *
 * @param event - The `pointerdown`. A pointer that is not a touch changes nothing.
 *
 * @internal
 */
export function holdTextSelection({
	pointerType,
	pointerId,
}: Pick<PointerEvent, 'pointerType' | 'pointerId'>) {
	if (pointerType !== 'touch' || held.has(pointerId)) return

	clearTimeout(release)

	release = undefined

	if (held.size === 0) {
		window.addEventListener('pointerup', end, true)

		window.addEventListener('pointercancel', end, true)
	}

	held.add(pointerId)

	const root = document.documentElement

	if (owned || root.classList.contains(HOLD)) return

	root.classList.add(HOLD)

	owned = true
}
