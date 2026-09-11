const SCROLLABLE_RE = /auto|scroll/

/**
 * Whether a press landed on `target`'s own scrollbar gutter rather than on its content.
 *
 * A press there is the start of a pan, so it must not be read as a press on what the scroller
 * holds: a floating surface does not dismiss for it, and a selection drawn over a scrolling
 * page is not put down by it.
 *
 * @param event - The press. Only `offsetX` and `offsetY` are read, so a `MouseEvent` or any of
 * its subtypes serves.
 * @param target - The element the press landed on, which is the scroller when the press was in
 * its gutter.
 * @returns True when the point sits in the vertical or the horizontal gutter.
 * @remarks An axis is only tested where it can actually scroll, so a bordered box that does not
 * overflow has no gutter to press. The vertical gutter sits on the inline-start edge under
 * `direction: rtl`, which is why the test is not simply "past the content box on the right".
 */
export function isScrollbarPress(
	event: Pick<MouseEvent, 'offsetX' | 'offsetY'>,
	target: HTMLElement,
): boolean {
	const style = getComputedStyle(target)

	// The root (html/body) scrolls the page even though its computed overflow is
	// `visible`; floating-ui treats the last traversable node as scrollable.
	const isRoot = target === document.documentElement || target === document.body

	const scrollableX = isRoot || SCROLLABLE_RE.test(style.overflowX)
	const scrollableY = isRoot || SCROLLABLE_RE.test(style.overflowY)

	const canScrollX =
		scrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth
	const canScrollY =
		scrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight

	const onVerticalScrollbar =
		canScrollY &&
		(style.direction === 'rtl'
			? event.offsetX <= target.offsetWidth - target.clientWidth
			: event.offsetX > target.clientWidth)
	const onHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight

	return onVerticalScrollbar || onHorizontalScrollbar
}
