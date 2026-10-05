/** An element's border box, on the two axes a resize is read along. */
export type BorderBox = {
	inline: number
	block: number
}

/**
 * An element's border box, taken from a `ResizeObserver` entry where one is at
 * hand and measured where none is.
 *
 * Border box, not `contentRect`: the content box excludes the element's own
 * padding and border, which under-sizes a container and clips the bottom of it.
 *
 * The entry is preferred because it is already measured. `getBoundingClientRect`
 * forces the browser to lay the document out to answer, and an observer callback
 * is handed the box it fired on.
 *
 * @param target The element to fall back to measuring.
 * @param borderBox The observer entry's own reading, where the caller has one.
 */
export function measureBox(target: Element, borderBox?: ResizeObserverSize): BorderBox {
	if (borderBox) return { inline: borderBox.inlineSize, block: borderBox.blockSize }

	const rect = target.getBoundingClientRect()

	return { inline: rect.width, block: rect.height }
}

/** An element's content box, in CSS px. */
export type ContentBox = {
	width: number
	height: number
}

/**
 * An element's content box: the box that its children lay out in. Use it to
 * size a child that fills the element, for example a canvas.
 *
 * Content box, not border box: a child that takes the border box of its parent
 * is too large by the border and the padding. In a parent that takes its size
 * from its content, each resize then makes the parent larger.
 *
 * The client size is the padding box less a scrollbar. The function subtracts
 * the computed padding from it. The client size ignores CSS transforms, so a
 * scaled ancestor does not change the result. The browser rounds the client
 * size to a whole pixel.
 *
 * @param target The element to measure.
 */
export function measureContentBox(target: Element): ContentBox {
	const style = getComputedStyle(target)

	return {
		width:
			target.clientWidth -
			(Number.parseFloat(style.paddingLeft) || 0) -
			(Number.parseFloat(style.paddingRight) || 0),
		height:
			target.clientHeight -
			(Number.parseFloat(style.paddingTop) || 0) -
			(Number.parseFloat(style.paddingBottom) || 0),
	}
}
