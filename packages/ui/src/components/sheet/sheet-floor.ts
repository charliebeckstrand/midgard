import type { PanelAxis } from '../../hooks/use-panel-resize'

/**
 * The narrowest a `left` or `right` sheet resizes to.
 *
 * A constant, where the drawer measures. A drawer shrinks along the axis its
 * chrome stacks on, so the floor is however much of it cannot scroll. A sheet
 * docked to a side has a body that scrolls the other way, and gives nothing
 * back as it narrows. What bounds it is legibility. A column this wide still
 * holds a line of text, a control, and the grip to pull it back out by.
 *
 * It is a width figure. A `top` or `bottom` sheet resizes its height, and
 * {@link sheetFloor} measures that floor instead.
 */
const MIN_WIDTH = 280

/**
 * The smallest a sheet resizes to, given the panel, the size it measures now,
 * and the axis it resizes on.
 *
 * On the width axis, the floor is {@link MIN_WIDTH}, whatever the sheet holds.
 *
 * On the height axis, the floor is everything in the sheet that does not scroll.
 * A `top` or `bottom` sheet's body scrolls on the same axis as a drawer's body.
 * So the floor is measured as `drawerFloor` measures it. A width figure there
 * makes a short sheet jump taller on the first move of a drag.
 *
 * A sheet with no body has no chrome to measure. Its floor is then the smaller
 * of its size and {@link MIN_WIDTH}, so a drag never makes it jump.
 *
 * @internal
 */
export function sheetFloor(panel: HTMLElement, size: number, axis: PanelAxis): number {
	if (axis === 'width') return MIN_WIDTH

	const body = panel.querySelector('[data-slot="sheet-body"]')

	if (body === null) return Math.min(size, MIN_WIDTH)

	// What the panel measures now, less the one part of it that can give: the
	// scrolling body.
	return size - body.getBoundingClientRect().height
}

/**
 * The widest a sheet is drawn at: the screen, less the inset it floats on.
 *
 * The inset is measured off the panel rather than stated, because it is a
 * breakpoint's decision and not this function's. The panel sits flush on a
 * phone and a step in from every edge above `sm`, and a consumer can move it
 * again. Whatever gap it holds on the side it is docked to is the gap it keeps
 * at its widest. A sheet dragged all the way out is therefore inset evenly,
 * rather than running its far edge off the other side of the screen.
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
