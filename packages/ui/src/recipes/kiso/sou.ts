/**
 * Sou (層): app-level stacking order.
 *
 * The rungs a portalled surface lands on, in one ordered table. Everything
 * here escapes the page's own stacking contexts — each rung is read by a
 * surface that renders into the portal container or `document.body`, where
 * DOM order alone decides nothing and the number is the whole contract.
 * Component-local `z-10` / `z-20` inside a positioned box is a different
 * concern and stays inline; only a layer that ranks against *other surfaces*
 * belongs here.
 *
 * The order is the point, so read the rungs as a ladder rather than as four
 * independent values:
 *
 * `overlay` seals the page for a transaction — Dialog, Sheet, Drawer.
 *
 * `chrome` is application furniture a sealing overlay must not cover: a
 * `PersistentChrome` region, and the companion furniture such regions need,
 * like the sidebar's pointer buffer. It clears `overlay`, or the scrim would
 * paint over the very control the region keeps reachable.
 *
 * `float` is every transient anchored surface — tooltip, popover, menu,
 * select, combobox, listbox, date and colour picker. It clears the overlay
 * and chrome rungs alike, because a float is routinely raised *from inside* a
 * panel or a chrome region, and a
 * tooltip that renders under the panel it describes is worse than no tooltip.
 *
 * `lens` is a surface that magnifies the content beneath it — the PDF viewer's
 * hover loupe. It clears `float` because everything on that rung *describes*
 * content, while a lens *is* the content, enlarged: a tooltip anchored to the
 * very region being inspected would sit inside the loupe and hide the thing
 * the reader leaned in to read. Sharing the rung left that to DOM order, which
 * resolved it the wrong way — a tooltip mounted on selection portals after the
 * lens.
 *
 * `toast` is topmost and unconditional. A toast reports something that
 * happened to the application, not to the surface in front of the user, so no
 * surface may cover it — a lens included.
 *
 * Layer: kiso · Concern: sou
 */

export const sou = {
	overlay: 'z-99',
	chrome: 'z-100',
	float: 'z-101',
	lens: 'z-102',
	toast: 'z-103',
} as const
