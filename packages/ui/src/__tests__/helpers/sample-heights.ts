/**
 * Samples `element`'s border-box height once per frame for `ms`.
 *
 * The browser suites' probe for a tweened box. Whether a height *travels*
 * instead of snapping to the target the moment anything re-renders is the one
 * thing jsdom cannot observe, so the cases that assert it sample across frames
 * and read the spread.
 */
export async function sampleHeights(element: Element, ms: number): Promise<number[]> {
	const samples: number[] = []

	const start = performance.now()

	await new Promise<void>((resolve) => {
		const tick = () => {
			samples.push(element.getBoundingClientRect().height)

			if (performance.now() - start < ms) requestAnimationFrame(tick)
			else resolve()
		}

		requestAnimationFrame(tick)
	})

	return samples
}

/**
 * Waits two animation frames — long enough for a `ResizeObserver` to deliver.
 *
 * Observer callbacks land at the end of a frame, so anything that takes its
 * baseline from a first delivery has not taken it yet in the task that rendered.
 */
export function frames(): Promise<void> {
	return new Promise((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	)
}

/** Whether at least one sample sits strictly inside `(low, high)` — a travel, not a snap. */
export function hasIntermediate(samples: number[], low: number, high: number): boolean {
	return samples.some((height) => height > low + 1 && height < high - 1)
}
