import { isScrollOverflow } from './scroll-overflow'

/** Options for {@link scrollerOf}. @internal */
export type ScrollerOptions = {
	/**
	 * Whether a container that scrolls on the inline (horizontal) axis also
	 * matches. A container that scrolls on the block (vertical) axis always
	 * matches.
	 * @defaultValue false
	 */
	inline?: boolean
	/**
	 * Whether the content must overflow the container now. When false, the
	 * overflow value alone decides, so the lookup also works before the content
	 * renders.
	 * @defaultValue false
	 */
	overflowing?: boolean
	/**
	 * Whether an ancestor that clips an axis that matches (`overflow: hidden` or
	 * `clip`) ends the walk with `null`. Nothing outside that ancestor can bring
	 * the start into view.
	 * @defaultValue false
	 */
	stopAtClip?: boolean
}

function isClipping(overflow: string): boolean {
	return overflow === 'hidden' || overflow === 'clip'
}

/** Whether one axis scrolls: by its overflow value, and by its size when `overflowing`. */
function axisScrolls(
	overflow: string,
	scrollSize: number,
	clientSize: number,
	overflowing: boolean,
): boolean {
	return isScrollOverflow(overflow) && (!overflowing || scrollSize > clientSize)
}

/**
 * The scroller of `start`: the nearest element from `start` up that
 * scrolls, or `null`. Pass `node.parentElement` to skip the node itself.
 *
 * The walk stops below `<body>`. The body and the root give their overflow to
 * the viewport, so neither is the scroller of a node. A caller that
 * scrolls the page in that case uses `document.documentElement`.
 *
 * @internal
 */
export function scrollerOf(
	start: HTMLElement | null,
	{ inline = false, overflowing = false, stopAtClip = false }: ScrollerOptions = {},
): HTMLElement | null {
	const { body, documentElement: root } = start?.ownerDocument ?? {}

	for (
		let element = start;
		element && element !== body && element !== root;
		element = element.parentElement
	) {
		const { overflowX, overflowY } = getComputedStyle(element)

		const block = axisScrolls(overflowY, element.scrollHeight, element.clientHeight, overflowing)

		const across =
			inline && axisScrolls(overflowX, element.scrollWidth, element.clientWidth, overflowing)

		if (block || across) return element

		if (stopAtClip && (isClipping(overflowY) || (inline && isClipping(overflowX)))) return null
	}

	return null
}
