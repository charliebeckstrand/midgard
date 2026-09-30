/**
 * The named tolerances of the geometry tests.
 *
 * @remarks
 * A geometry assertion states its tolerance with one of these names, not with a
 * bare number. The name records why two values can differ, so a reader does not
 * have to guess whether `0.5` is slack for rounding or a hidden bug. A case that
 * needs a larger value states its own constant beside the case, with the reason.
 *
 * The box matchers default to no slack. Chromium keeps a length as a whole
 * number of layout units, and a unit is a power-of-two fraction of a pixel. The
 * edges of a box with no transform are therefore exact in floating point. A
 * derived edge, a transformed box, and an edge that the engine snaps to the
 * pixel grid each need a tolerance.
 */

/**
 * The arithmetic noise of a pure calculation in floating point: a sum of
 * fractions, or a projection and its inverse.
 */
export const FLOAT = 1e-9

/**
 * One layout unit of Chromium, which keeps each length as a count of 1/64 px.
 * An edge that the engine derives, such as the center of a box with an odd
 * width, can land one unit away from the edge that a test computes.
 */
export const LAYOUT_UNIT = 1 / 64

/**
 * One CSS pixel: the error of an edge that the engine snaps to the pixel grid.
 * A border, a scroll offset, and a composited transform can each snap.
 */
export const PIXEL = 1
