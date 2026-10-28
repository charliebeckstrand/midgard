import { flushSync } from 'react-dom'

/**
 * Observes `target`, and commits each new reading before the browser paints.
 *
 * @remarks Use it where a measurement of a box sets the size of the content in
 * that box. A plain `setState` from a `ResizeObserver` commits in a later task,
 * after the paint. Thus each frame that resizes the box paints the content at
 * the size of the frame before it. When the box narrows, the content then
 * overflows its edge. A rail that slides open beside the box shows that on each
 * frame of the slide.
 *
 * A `ResizeObserver` callback runs after layout and before paint, and a change
 * to the DOM in the callback runs layout again in the same frame. Thus the
 * callback commits the reading in `flushSync`, and the frame that resizes the
 * box shows the content at the matching size.
 *
 * `measure` reads the box, and returns the update only when the content does
 * not match the reading yet. It compares the reading with the state that the
 * content shows, not with the last reading of the observer, because the owner
 * can also commit a reading of its own. Thus the first callback of the
 * observation, and a change on an axis that the content ignores, commit
 * nothing.
 *
 * A flush also renders each update that waits, because React renders the sync
 * lane and the default lane together. Such an update can resize the box again
 * in the same delivery. The browser then holds that notification for the next
 * frame, and fires "ResizeObserver loop completed with undelivered
 * notifications" on `window`. Thus a commit stops the observation for the rest
 * of the delivery, and observes again in the next frame, before the delivery of
 * that frame. The new observation reports the size that it finds, so no resize
 * is lost.
 *
 * The flush can unmount the owner, and the cleanup then runs inside it. The
 * cleanup cancels the next observation.
 *
 * @param target - The box to observe.
 * @param measure - Reads the box. Returns the update that commits the reading,
 * or nothing when the content already matches it.
 * @returns A function that stops the observation.
 */
export function observeResizeBeforePaint(
	target: Element,
	measure: () => (() => void) | undefined,
): () => void {
	let frame = 0

	let stopped = false

	const observer = new ResizeObserver(() => {
		const update = measure()

		if (!update) return

		observer.disconnect()

		flushSync(update)

		if (!stopped) frame = requestAnimationFrame(() => observer.observe(target))
	})

	observer.observe(target)

	return () => {
		stopped = true

		cancelAnimationFrame(frame)

		observer.disconnect()
	}
}
