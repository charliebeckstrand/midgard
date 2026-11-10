/**
 * Omote glass: fully transparent glass surface. Blur only; the host
 * inherits its color from whatever sits behind.
 *
 * The glass has no fill, so it sets `--surface-fill` to `transparent`. The
 * property inherits, so a sticky descendant (a grid header or a frozen column)
 * paints no fill of its own. Without this, the descendant reads the fill of a
 * surface outside the glass, such as the page, and shows as a box.
 *
 * Layer: kiso · Concern: glass surface
 */

import { blur } from './blur'

/** The clear fill of glass, with no blur. */
const clear = ['bg-transparent', '[--surface-fill:transparent]']

export const glass = [...clear, blur.md]

/**
 * The glass of a modal panel (Dialog, Drawer, Sheet): the same clear fill,
 * with the `lg` blur. A modal panel covers more of the page than a popover,
 * so its text needs the deeper blur to stay legible over busy content.
 */
export const panelGlass = [...clear, blur.lg]
