/**
 * Gives the width, in pixels, by which the text of `element` extends past its
 * box. A value above zero means that the box clips the text.
 *
 * @remarks
 * A `Range` over the contents measures the laid-out text to a fraction of a
 * pixel. `scrollWidth` and `clientWidth` round to whole pixels, so they read a
 * clip under half a pixel as a fit.
 */
export function textOverflow(element: Element): number {
	const range = document.createRange()

	range.selectNodeContents(element)

	return range.getBoundingClientRect().width - element.getBoundingClientRect().width
}
