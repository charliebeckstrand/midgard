import { frame } from '../../helpers/frames'

/** The size of the tester window, as `resize` reports it. */
function windowSize(): string {
	return `${innerWidth}x${innerHeight}`
}

/**
 * The size at the last `resize` event of the tester window, or `undefined`
 * before the first wait. One page serves each file of an instance, so the
 * value lives as long as the page.
 */
let delivered: string | undefined

addEventListener('resize', () => {
	delivered = windowSize()
})

/**
 * Waits until the browser sends the `resize` event for the current size of the
 * tester window.
 *
 * Vitest sets the size of the tester iframe before each file, and a file can
 * set its own size in a `beforeAll`. Each call returns when Vitest has set the
 * size, before the browser sends `resize`. The browser sends the event in its
 * next rendering update, and a case can render before that update. A listener
 * then gets the event in the case. Motion stops each layout animation for
 * 250ms after a change of the width, so a morph that the case starts gets no
 * frames. `active-indicator-morph-radius` failed on CI in this way, in the file
 * after `lightbox-corners`.
 *
 * The read of the size lays out the page of the runner, so the iframe takes
 * its new size at once. In a rendering update, the browser sends `resize`
 * before it calls the animation frame callbacks. Thus the event has come when
 * the next frame callback runs. When the last event gave the current size, no
 * event is due, and the wait returns at once.
 */
export async function settleViewport(): Promise<void> {
	const size = windowSize()

	if (size === delivered) return

	await frame()

	delivered = size
}
