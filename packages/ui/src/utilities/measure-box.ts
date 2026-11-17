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
 * `stable` subtracts only a gutter that `scrollbar-gutter: stable` reserves,
 * and not a scrollbar that comes and goes with an overflow. Use it to fit
 * content that can overflow the element. Content that takes its size from a
 * box less its scrollbars can stop its own overflow, and the scrollbar then
 * goes and the box grows again, on each frame. The stable box starts from the
 * offset size, which also ignores transforms and is rounded.
 *
 * @param target - The element to measure.
 * @param options.stable - Ignore a scrollbar that the element does not reserve.
 */
export function measureContentBox(
	target: HTMLElement,
	{ stable = false }: { stable?: boolean } = {},
): ContentBox {
	const style = getComputedStyle(target)

	const px = (value: string) => Number.parseFloat(value) || 0

	let width = target.clientWidth

	let height = target.clientHeight

	if (stable) {
		const borderX = px(style.borderLeftWidth) + px(style.borderRightWidth)

		// The client width already excludes a reserved gutter, with or without an overflow.
		width = style.scrollbarGutter?.startsWith('stable') ? width : target.offsetWidth - borderX

		height = target.offsetHeight - px(style.borderTopWidth) - px(style.borderBottomWidth)
	}

	return {
		width: width - px(style.paddingLeft) - px(style.paddingRight),
		height: height - px(style.paddingTop) - px(style.paddingBottom),
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
