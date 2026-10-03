/**
 * Narabi revealed: the box of content that a toggle shows or swaps, such as
 * an accordion panel, a collapse panel, or a tab panel. The box fills the
 * width of its container, but its content does not set that width. Thus a
 * unit keeps one width when a section opens, closes, or changes. Without this
 * rule, a unit in a box that fits its content gets wider each time that a
 * long line of text shows.
 *
 * Layer: kiso · Concern: width of revealed content
 */

export const revealed = 'contain-inline-size'
