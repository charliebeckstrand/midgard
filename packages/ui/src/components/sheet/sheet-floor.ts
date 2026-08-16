import type { PanelAxis } from '../../hooks/use-panel-resize'

/**
 * The narrowest a sheet resizes to.
 *
 * A constant, where the drawer measures: a drawer shrinks along the axis its
 * chrome stacks on, so the floor is however much of it cannot scroll, while a
 * sheet's body scrolls the other way and gives nothing back as it narrows. What
 * bounds it is legibility — a column this wide still holds a line of text, a
 * control, and the grip to pull it back out by.
 */
const MIN_WIDTH = 280

/** The narrowest a sheet resizes to, whatever it holds. See {@link MIN_WIDTH}. @internal */
export function sheetFloor(): number {
	return MIN_WIDTH
}

/**
 * The widest a sheet is drawn at: the screen, less the inset it floats on.
 *
 * The inset is measured off the panel rather than stated, because it is a
 * breakpoint's decision and not this function's — the panel sits flush on a
 * phone and a step in from every edge above `sm`, and a consumer can move it
 * again. Whatever gap it holds on the side it is docked to is the gap it keeps
 * at its widest, so a sheet dragged all the way out is inset evenly rather than
 * running its far edge off the other side of the screen.
 *
 * @internal
 */
export function sheetCeiling(panel: HTMLElement, viewport: number, axis: PanelAxis): number {
	const box = panel.getBoundingClientRect()

	// The two edges across the axis the panel is docked on. Whichever sits nearer
	// the screen's is the inset the reader can see.
	const [near, far] =
		axis === 'width' ? [box.left, viewport - box.right] : [box.top, viewport - box.bottom]

	const inset = Math.max(0, Math.min(near, far))

	return viewport - inset * 2
}
