/**
 * The shortest a drawer with nothing to give resizes to — a grip and a little
 * under it, so it is still a panel and still has something to pull back up by.
 *
 * A floor of last resort. {@link drawerFloor} measures the real one, which is
 * taller on any panel that has chrome.
 */
const MIN_HEIGHT = 140

/**
 * The shortest a drawer resizes to: everything in it that does not scroll.
 *
 * Measured, not a constant, because it is the consumer's chrome — a title, a
 * footer of actions — and the drawer cannot know how much of that there is. Fall
 * short of it and the body has already given all it has, so the next pixel comes
 * out of the footer, which slides off the bottom of the screen with the buttons
 * on it.
 *
 * It is the drawer's own because the floor is a fact about what a panel holds
 * rather than about the axis it resizes on — `usePanelResize` takes it as an
 * argument for exactly that reason.
 *
 * @internal
 */
export function drawerFloor(panel: HTMLElement, height: number): number {
	const body = panel.querySelector('[data-slot="drawer-body"]')

	if (body === null) return MIN_HEIGHT

	// What the panel measures now, less the one part of it that can give: the
	// scrolling body. A body already collapsed reports zero and the floor is the
	// whole panel, which is right — there is nothing left to take.
	return height - body.getBoundingClientRect().height
}

/**
 * The tallest a drawer is drawn at: the screen, or the cap its own variant sets.
 *
 * `auto` stops short of the top edge, and a drag that ignored that would commit
 * and report a height the element never takes.
 *
 * @internal
 */
export function drawerCeiling(panel: HTMLElement, viewport: number): number {
	const cap = Number.parseFloat(getComputedStyle(panel).maxHeight)

	return Number.isFinite(cap) ? Math.min(cap, viewport) : viewport
}
