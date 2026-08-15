/**
 * The narrowest a sheet resizes to.
 *
 * A constant, where the drawer measures: a drawer shrinks along the axis its
 * chrome stacks on, so the floor is however much of it cannot scroll, while a
 * sheet's body scrolls the other way and gives nothing back as it narrows. What
 * bounds it is legibility — a column this wide still holds a line of text, a
 * control, and the grip to pull it back out by.
 *
 * @internal
 */
const MIN_WIDTH = 280

/** The narrowest a sheet resizes to, whatever it holds. See {@link MIN_WIDTH}. @internal */
export function sheetFloor(): number {
	return MIN_WIDTH
}
