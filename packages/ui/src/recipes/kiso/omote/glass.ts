/**
 * Omote glass: fully transparent glass surface. Blur only; the host
 * inherits its color from whatever sits behind.
 *
 * The glass has no fill, so it sets `--surface-fill` to `transparent`. The
 * property inherits, so a sticky descendant (a grid header or a frozen column)
 * paints no fill of its own. Without this, the descendant reads the fill of a
 * surface outside the glass, such as the page, and shows as a box.
 *
 * The glass also sets `--popover-alpha` to `100%`, so a popover inside it
 * paints its fill opaque (`bg.popover`). The glass has a `backdrop-filter`, and
 * Chromium and WebKit then give the blur of a descendant nothing to blur. A
 * translucent popover fill would show the content behind it as it is, such as
 * the fields of a dialog.
 *
 * Layer: kiso · Concern: glass surface
 */

/** The clear fill of glass, with no blur. */
const clear = ['bg-transparent', '[--surface-fill:transparent]', '[--popover-alpha:100%]']

export const glass = [...clear, 'backdrop-blur-sm']

/**
 * The glass of a modal panel (Dialog, Drawer, Sheet): the same clear fill,
 * with the deeper blur. A modal panel covers more of the page than a popover,
 * so its text needs that blur to stay legible over busy content.
 */
export const panelGlass = [...clear, 'backdrop-blur-lg']
