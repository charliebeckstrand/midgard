/** The last input on the page: the pointer type of a press, or `keyboard`. */
let current: string | null = null

function recordPress(event: PointerEvent) {
	current = event.pointerType
}

function recordKey() {
	current = 'keyboard'
}

/**
 * Records the last input on the page. The press that opens an overlay, or that
 * mounts a tooltip trigger, comes before the reader of the value mounts, so the
 * listeners attach once, when the module loads, and stay for the life of the
 * page. They listen in the capture phase, so a handler that stops the event
 * does not hide it.
 */
function watchInput() {
	if (typeof window === 'undefined') return

	window.addEventListener('pointerdown', recordPress, { capture: true, passive: true })

	window.addEventListener('keydown', recordKey, { capture: true, passive: true })
}

watchInput()

/**
 * The last input on the page: the `pointerType` of the last press, `keyboard`
 * for a key press, or `null` before the first input.
 *
 * @internal
 */
export function lastInput(): string | null {
	return current
}

/**
 * Test-only: forgets the last input, so the next case starts as a page with no
 * input since the module loaded.
 *
 * @internal
 */
export function __resetLastInput(): void {
	current = null
}
