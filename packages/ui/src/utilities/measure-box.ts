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
