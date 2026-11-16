/**
 * Waits in the page until no target moves for `quiet` ms, or until `limit` ms
 * pass. A target is an element that a reader can press or focus. Give the
 * function to `page.evaluate`, which runs it in the page.
 *
 * @remarks
 * A chart or a grid measures its layout after the hydration, and part of that
 * work waits on a timer. A read of the boxes of the targets before that work
 * ends gives a different result in each run. A time, not a count of frames,
 * because a loaded machine gives fewer frames.
 *
 * @example
 * ```typescript
 * await tab.evaluate(settle, { quiet: 500, limit: 10_000 })
 * ```
 */
export function settle({ quiet, limit }: { quiet: number; limit: number }): Promise<void> {
	const targets = 'a[href], button, input, select, textarea, [role], [tabindex]'

	const layout = () =>
		[...document.querySelectorAll(targets)]
			.map((element) => {
				const { x, y, width, height } = element.getBoundingClientRect()

				return `${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}`
			})
			.join(';')

	return new Promise((resolve) => {
		const end = performance.now() + limit

		let prev = layout()

		let since = performance.now()

		const frame = () => {
			const now = performance.now()

			const next = layout()

			if (next !== prev) {
				prev = next

				since = now
			}

			if (now - since >= quiet || now > end) resolve()
			else requestAnimationFrame(frame)
		}

		requestAnimationFrame(frame)
	})
}
