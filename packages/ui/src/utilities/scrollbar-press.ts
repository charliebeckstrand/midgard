const SCROLLABLE_RE = /auto|scroll/

/**
 * The width of the vertical gutter: the border-box width less the client width and both borders.
 *
 * @remarks The border widths come from computed style. `clientLeft` is not used, because under
 * `direction: rtl` it also holds a left-side scrollbar.
 */
function verticalGutterWidth(target: HTMLElement, style: CSSStyleDeclaration): number {
	const borders =
		(Number.parseFloat(style.borderLeftWidth) || 0) +
		(Number.parseFloat(style.borderRightWidth) || 0)

	return target.offsetWidth - target.clientWidth - borders
}

/**
 * Whether a press landed on `target`'s own scrollbar gutter rather than on its content.
 *
 * A press there is the start of a pan, so it must not read as a press on what the scroller
 * holds. A floating surface does not dismiss for it, and a selection drawn over a scrolling
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
 * `offsetX` starts at the inner border edge. The RTL gutter therefore starts at zero, and the
 * borders are not part of it. The LTR gutter starts at `clientWidth`, and that pixel is part of it.
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
			? event.offsetX < verticalGutterWidth(target, style)
			: event.offsetX >= target.clientWidth)
	const onHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight

	return onVerticalScrollbar || onHorizontalScrollbar
}
