import type { DrawerPanelVariants } from '../../recipes/kata/drawer'

/**
 * The shortest a drawer with nothing to give resizes to: a grip and a little
 * under it. It is therefore still a panel, and still has something to pull back
 * up by.
 *
 * A floor of last resort. {@link drawerFloor} measures the real one, which is
 * taller on any panel that has chrome.
 */
const MIN_HEIGHT = 140

/**
 * The shortest a drawer resizes to.
 *
 * A drawer grown to its content (`auto` or `fit`) stops at `rest`, the height
 * it rests at. That height is its content, up to the cap of the variant, so a
 * shorter panel only hides rows behind a scroll. A menu that opens as a sheet
 * is such a drawer. Below its rest, the drag pulls the panel off the screen
 * instead, and a release there closes it.
 *
 * A drawer with a fixed height (`half` or `full`) stops at everything in it
 * that does not scroll. There the reader decides how much of the screen the
 * panel gets, and the body is the part that can give.
 *
 * Measured, not a constant, because it is the consumer's chrome: a title, a
 * footer of actions. The drawer cannot know how much of that there is. Fall
 * short of it and the body has already given all it has. The next pixel then
 * comes out of the footer, which slides off the bottom of the screen with the
 * buttons on it.
 *
 * It is the drawer's own because the floor is a fact about what a panel holds,
 * rather than about the axis it resizes on. `usePanelResize` takes it as an
 * argument for exactly that reason.
 *
 * @param panel - The panel element.
 * @param height - The height the panel measures now.
 * @param rest - The height the panel rests at, before the reader resized it.
 * @param variant - The `height` variant of the drawer.
 * @internal
 */
export function drawerFloor(
	panel: HTMLElement,
	height: number,
	rest: number,
	variant: DrawerPanelVariants['height'],
): number {
	if (variant !== 'half' && variant !== 'full') return rest

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
 * It answers for the fit as well as the gesture, so this number decides two
 * things. The first is where a drag stops. The second is where a `fit` panel is
 * standing at its ceiling, and squares the top corners it now meets the screen
 * edge with. Re-tune it and
 * both move.
 *
 * @internal
 */
export function drawerCeiling(panel: HTMLElement, viewport: number): number {
	const cap = Number.parseFloat(getComputedStyle(panel).maxHeight)

	return Number.isFinite(cap) ? Math.min(cap, viewport) : viewport
}
