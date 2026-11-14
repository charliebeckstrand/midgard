/**
 * Sou (層): app-level stacking order.
 *
 * The rungs a portaled surface lands on, in one ordered table. Everything
 * here escapes the page's own stacking contexts. Each rung is read by a
 * surface that renders into the portal container or `document.body`. There
 * DOM order alone decides nothing, and the number is the whole contract.
 * Component-local `z-10` / `z-20` inside a positioned box is a different
 * concern and stays inline; only a layer that ranks against *other surfaces*
 * belongs here.
 *
 * The order is the point, so read the rungs as a ladder rather than as
 * independent values:
 *
 * `overlay` is a surface that covers the page or a container: Dialog, Sheet,
 * Drawer, the stage of a Lightbox, and the furniture of such a surface, such as
 * the pointer buffer of the floating sidebar. A modal overlay seals the box
 * that it covers. App chrome that must stay reachable stays out of that box,
 * so it needs no rung.
 *
 * `float` is every transient anchored surface: tooltip, popover, menu,
 * select, combobox, listbox, date and color picker. It clears the overlay
 * rung, because a float is routinely raised *from inside* a panel. A tooltip that renders under the panel it describes
 * is worse than no tooltip. A float whose anchor is under an open overlay
 * would then paint over that overlay, so `useFloatingPanel` hides it while the
 * overlay is open (`utilities/overlay-layers`).
 *
 * `lens` is a surface that magnifies the content beneath it: the PDF viewer's
 * hover loupe. It clears `float` because everything on that rung *describes*
 * content, while a lens *is* the content, enlarged. A tooltip anchored to the
 * region being inspected would sit inside the loupe, and hide what the reader
 * leaned in to read. Sharing the rung left that to DOM order, which
 * resolved it the wrong way: a tooltip mounted on selection portals after the
 * lens.
 *
 * `toast` is topmost and unconditional. A toast reports something that
 * happened to the application, not to the surface in front of the user. No
 * surface can therefore cover it, a lens included.
 *
 * Layer: kiso · Concern: stacking order
 */

export const sou = {
	overlay: 'z-99',
	float: 'z-102',
	lens: 'z-103',
	toast: 'z-104',
} as const
