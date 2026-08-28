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

/** Whether at least one sample sits strictly inside `(low, high)` — a travel, not a snap. */
export function hasIntermediate(samples: number[], low: number, high: number): boolean {
	return samples.some((height) => height > low + 1 && height < high - 1)
}
