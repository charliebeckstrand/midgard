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
