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
	return observeResizePausing(target, () => {
		const update = measure()

		return update && (() => flushSync(update))
	})
}

/**
 * Observes `targets`, and stops the observation for the rest of a delivery
 * after a write that can resize a target.
 *
 * @remarks A write in the callback of a `ResizeObserver` can resize a target
 * again in the same delivery. The browser then holds that notification for the
 * next frame, and fires "ResizeObserver loop completed with undelivered
 * notifications" on `window`. Thus, after a write, the observer disconnects,
 * runs the write, and observes again in the next frame, before the delivery of
 * that frame. The new observation reports the size that it finds, so no resize
 * is lost.
 *
 * The write can unmount the owner, and the cleanup then runs inside it. The
 * cleanup cancels the next observation.
 *
 * @param targets - The boxes to observe.
 * @param measure - Reads the entries of a delivery. Returns the write, or
 * nothing when no target needs one.
 * @returns A function that stops the observation.
 *
 * @internal
 */
export function observeResizePausing(
	targets: Element | readonly Element[],
	measure: (entries: ResizeObserverEntry[]) => (() => void) | undefined,
): () => void {
	const list = targets instanceof Element ? [targets] : targets

	let frame = 0

	let stopped = false

	const observe = () => {
		for (const target of list) observer.observe(target)
	}

	const observer = new ResizeObserver((entries) => {
		const write = measure(entries)

		if (!write) return

		observer.disconnect()

		write()

		if (!stopped) frame = requestAnimationFrame(observe)
	})

	observe()

	return () => {
		stopped = true

		cancelAnimationFrame(frame)

		observer.disconnect()
	}
}
