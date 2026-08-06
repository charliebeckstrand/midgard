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
 * The order is the point, so read the rungs as a ladder rather than as five
 * independent values:
 *
 * `overlay` seals the page for a transaction — Dialog, Sheet, Drawer.
 *
 * `chrome` is application furniture that outranks a sealing overlay. Chiefly
 * chrome a consumer lifted so an overlay's `reachable` declaration can keep it
 * in the focus order — that has to clear `overlay`, or the scrim covers the
 * very control the declaration made reachable — and alongside it the companion
 * furniture such surfaces need, like the sidebar's pointer buffer.
 *
 * `elevated` is the inverse: an overlay that *is* the application's
 * navigation and so must cover the chrome above. One rung over `chrome` is
 * all it needs.
 *
 * `float` is every transient anchored surface — tooltip, popover, menu,
 * select, combobox, listbox, date and colour picker. It clears every overlay
 * rung because a float is routinely raised *from inside* a panel, and a
 * tooltip that renders under the panel it describes is worse than no tooltip.
 *
 * `toast` is topmost and unconditional. A toast reports something that
 * happened to the application, not to the surface in front of the user, so no
 * surface may cover it.
 *
 * Layer: kiso · Concern: sou
 */

export const sou = {
	overlay: 'z-99',
	chrome: 'z-100',
	elevated: 'z-101',
	float: 'z-102',
	toast: 'z-103',
} as const
