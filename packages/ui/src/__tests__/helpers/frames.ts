/**
 * Waits two animation frames.
 *
 * Long enough for a `ResizeObserver` to deliver: observer callbacks land at the
 * end of a frame, so anything that takes a baseline or settles a measurement
 * from a first delivery has not done it yet in the task that rendered.
 */
export function frames(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	})
}

/**
 * Waits until the next frame has painted. A task that a frame callback queues
 * runs after that frame paints. A read inside the frame callback would see a
 * layout that the browser can correct before the paint, such as a scroll move
 * from a `ResizeObserver` callback.
 */
export function nextPaint(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => setTimeout(resolve, 0))
	})
}
