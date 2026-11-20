import { clamp } from './clamp'

/**
 * The attribute on a bar that sticks to the top of its scroller. `useStickyBars`
 * writes it on each bar of a layout that sticks at the current width.
 * @internal
 */
const STICKY_BAR = 'data-sticky-bar'

/** Marks `bar` as a bar that sticks, or removes the mark. @internal */
export function markStickyBar(bar: Element, sticks: boolean): void {
	if (sticks) bar.setAttribute(STICKY_BAR, '')
	else bar.removeAttribute(STICKY_BAR)
}

/**
 * Whether a sticky bar covers all of `rect`, the box of `anchor`. The box is
 * above the bottom edge of the bar, and a hit test at the box finds the bar.
 * The hit test keeps these references in view: a reference in the bar, a
 * reference beside the bar, and a reference on a surface that paints over the
 * bar, such as a drawer or a dialog.
 *
 * @remarks A scroll fade also sets `scroll-padding`, and an item under a fade
 * shows. Thus the mark on the bar, not the `scroll-padding` of the scroller,
 * names a bar.
 * @internal
 */
export function isUnderStickyBar(anchor: Element, rect: Omit<DOMRect, 'toJSON'>): boolean {
	const document = anchor.ownerDocument

	if (!document.querySelector(`[${STICKY_BAR}]`)) return false

	const { clientWidth, clientHeight } = document.documentElement

	// The center of the box on the inline axis, and its last row of pixels.
	const x = clamp(rect.left + rect.width / 2, 0, clientWidth - 1)

	const y = clamp(rect.bottom - 1, 0, clientHeight - 1)

	const bar = document.elementFromPoint(x, y)?.closest(`[${STICKY_BAR}]`)

	if (!bar || bar.contains(anchor)) return false

	return rect.bottom <= bar.getBoundingClientRect().bottom
}
