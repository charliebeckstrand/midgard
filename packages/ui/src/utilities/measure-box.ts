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
 * @param target - The element to fall back to measuring.
 * @param borderBox - The observer entry's own reading, where the caller has one.
 */
export function measureBox(target: Element, borderBox?: ResizeObserverSize): BorderBox {
	if (borderBox) return { inline: borderBox.inlineSize, block: borderBox.blockSize }

	const rect = target.getBoundingClientRect()

	return { inline: rect.width, block: rect.height }
}

/** An element's content box, in CSS px. @internal */
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
 * @param target - The element to measure.
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

/**
 * The content box of a scroll container, less only the scrollbar space that
 * the container reserves. Use it to fit content to a scroll container, where
 * the content can overflow the box.
 *
 * {@link measureContentBox} subtracts each scrollbar that shows. Content that
 * takes its size from that reading and then overflows gives the box a
 * scrollbar, and the scrollbar makes the reading smaller. The content then
 * shrinks, and can stop the overflow. The scrollbar then goes, and the reading
 * is large again. This reading does not change when a scrollbar comes or
 * goes, so that loop cannot start.
 *
 * The reading starts from the border box. It subtracts the borders, the
 * padding, and a gutter that `scrollbar-gutter: stable` reserves. A reserved
 * gutter is in the box whether or not the content overflows, so the content
 * must not lay out in it. The client width does not include the gutter, so the
 * gutter is the border box less the borders and the client width.
 * `scrollbar-gutter` reserves no space for a horizontal scrollbar.
 *
 * The offset size ignores CSS transforms, as the client size does, and the
 * browser rounds it to a whole pixel.
 *
 * @param target - The scroll container to measure.
 * @internal
 */
export function measureScrollContentBox(target: HTMLElement): ContentBox {
	const style = getComputedStyle(target)

	const px = (value: string) => Number.parseFloat(value) || 0

	const borderX = px(style.borderLeftWidth) + px(style.borderRightWidth)

	const borderY = px(style.borderTopWidth) + px(style.borderBottomWidth)

	const gutter = style.scrollbarGutter?.startsWith('stable')
		? target.offsetWidth - borderX - target.clientWidth
		: 0

	return {
		width: target.offsetWidth - borderX - gutter - px(style.paddingLeft) - px(style.paddingRight),
		height: target.offsetHeight - borderY - px(style.paddingTop) - px(style.paddingBottom),
	}
}

/**
 * The tallest that `target` can be in `room`: its computed `max-height`, and
 * never more than `room`. A cap of `none` gives `room`. A `calc()` cap that
 * the browser gives back as a formula, and not as pixels, gives `room` too.
 *
 * A browser can give a `%` cap back as a share, and not as pixels. The share
 * is then of `room`, the box that the element stands in.
 *
 * @param target - The element with the cap.
 * @param room - The height of the box around `target`, in CSS px.
 * @internal
 */
export function maxHeightIn(target: Element, room: number): number {
	const maxHeight = getComputedStyle(target).maxHeight

	const cap = maxHeight.endsWith('%')
		? (Number.parseFloat(maxHeight) / 100) * room
		: Number.parseFloat(maxHeight)

	return Number.isFinite(cap) ? Math.min(cap, room) : room
}
