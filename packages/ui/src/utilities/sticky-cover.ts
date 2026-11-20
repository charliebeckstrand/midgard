/**
 * The attribute that names the height (px) at the top of a scroller that its
 * sticky bars cover. `useStickyBars` writes it on the scroller of a layout, and
 * the root element holds it for the viewport. A floating panel whose reference
 * is all in that height hides, as a panel whose reference scrolled out of view
 * does.
 *
 * @remarks An attribute, not `scroll-padding`. A scroll fade also sets
 * `scroll-padding`, and an item under a fade shows.
 * @internal
 */
const STICKY_COVER = 'data-sticky-cover-top'

/** Writes the height that the sticky bars of `scroller` cover, or removes it at 0. @internal */
export function writeStickyCover(scroller: Element, cover: number): void {
	if (cover > 0) scroller.setAttribute(STICKY_COVER, String(cover))
	else scroller.removeAttribute(STICKY_COVER)
}

/** The height that the sticky bars of `scroller` cover, or 0. @internal */
export function readStickyCover(scroller: Element): number {
	return Number(scroller.getAttribute(STICKY_COVER)) || 0
}
