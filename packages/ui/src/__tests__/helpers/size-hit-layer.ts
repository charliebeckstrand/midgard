/**
 * Gives the hit layer of a chart a box on the screen. jsdom gives each box a
 * zero size, so a pointer event cannot map into the plot until the layer has
 * one. The box starts at the origin, and its size is the plot size times
 * `scale`.
 *
 * @param hit - The `chart-hit` rect. Its `width` and `height` attributes give
 * the plot size.
 * @param scale - The ratio of the screen box to the plot. A value of 2 acts as
 * an ancestor zoom.
 * @returns The plot size, from the attributes of the rect.
 */
export function sizeHitLayer(hit: Element, scale = 1): { width: number; height: number } {
	const width = Number(hit.getAttribute('width'))

	const height = Number(hit.getAttribute('height'))

	const right = width * scale

	const bottom = height * scale

	hit.getBoundingClientRect = () =>
		({
			left: 0,
			top: 0,
			right,
			bottom,
			width: right,
			height: bottom,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}) as DOMRect

	return { width, height }
}
