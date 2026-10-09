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
 * The order is the point, so read the rungs as a ladder rather than as six
 * independent values:
 *
 * `overlay` seals the page for a transaction — Dialog, Sheet, Drawer.
 *
 * `chrome` is application furniture a sealing overlay must not cover: a
 * `Chrome` region, and the companion furniture such regions need,
 * like the sidebar's pointer buffer. It clears `overlay`, or the scrim would
 * paint over the very control the region keeps reachable.
 *
 * `cover` is a sealing overlay that also covers the chrome, such as the stage
 * of a lightbox. Chrome furniture has no use over a full-screen photo, and it
 * hides the controls of the stage. Such an overlay keeps the focus away from
 * the chrome too. A float raised from inside it still clears it.
 *
 * `float` is every transient anchored surface — tooltip, popover, menu,
 * select, combobox, listbox, date and color picker. It clears the overlay
 * and chrome rungs alike, because a float is routinely raised *from inside* a
 * panel or a chrome region. A tooltip that renders under the panel it describes
 * is worse than no tooltip.
 *
 * `lens` is a surface that magnifies the content beneath it — the PDF viewer's
 * hover loupe. It clears `float` because everything on that rung *describes*
 * content, while a lens *is* the content, enlarged. A tooltip anchored to the
 * region being inspected would sit inside the loupe, and hide what the reader
 * leaned in to read. Sharing the rung left that to DOM order, which
 * resolved it the wrong way — a tooltip mounted on selection portals after the
 * lens.
 *
 * `toast` is topmost and unconditional. A toast reports something that
 * happened to the application, not to the surface in front of the user. No
 * surface can therefore cover it, a lens included.
 *
 * Layer: kiso · Concern: sou
 */

export const sou = {
	overlay: 'z-99',
	chrome: 'z-100',
	cover: 'z-101',
	float: 'z-102',
	lens: 'z-103',
	toast: 'z-104',
} as const
