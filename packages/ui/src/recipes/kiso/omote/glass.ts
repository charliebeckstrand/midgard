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

export const glass = ['bg-transparent', '[--surface-fill:transparent]', blur.md]
