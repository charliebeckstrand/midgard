/**
 * Which surface each floating portal node holds, and the descendancy question
 * outside-press tests ask of it.
 *
 * @remarks
 * Its own module rather than part of `use-floating-ui` so that `useDismissable`
 * — a generic outside-press boundary with no floating panel of its own — can
 * ask the question without pulling `@floating-ui/react` into every Dialog,
 * Sheet, and Drawer that only ever wanted a dismiss handler.
 */

/** The marker `PresencePortal` stamps on each teleport node. @internal */
const PORTAL_SELECTOR = '[data-floating-ui-portal]'

/**
 * Portal node → a getter for the reference element the surface inside it opened
 * from.
 *
 * @remarks
 * The DOM cannot answer this. `PresencePortal` passes an explicit `root` under a
 * `<UIProvider>`, so every surface's portal is a sibling `<div>` under one node
 * whatever opened it — ancestry carries no nesting information. A getter rather
 * than an element because a panel's reference can change while it is open (a
 * context menu re-anchoring to a new cursor point).
 *
 * @internal
 */
const portalReferences = new WeakMap<Element, () => Element | null>()

/**
 * How many portals currently publish a reference. A `WeakMap` has no `size`, and
 * the overwhelmingly common press — on plain page content, with nothing open
 * that could claim it — is worth settling on an integer compare rather than a
 * root-ward DOM walk, once per open boundary per press.
 *
 * @internal
 */
let publishedCount = 0

/** The floating portal `node` sits in, if any. @internal */
export function closestFloatingPortal(node: Node | null | undefined): Element | null {
	return node instanceof Element ? node.closest(PORTAL_SELECTOR) : null
}

/**
 * Publishes a panel's reference against its portal node, so another surface's
 * outside-press test can recognise it. Returns the teardown.
 *
 * @internal
 */
export function publishPortalReference(
	portal: Element,
	getReference: () => Element | null,
): () => void {
	if (!portalReferences.has(portal)) publishedCount++

	portalReferences.set(portal, getReference)

	return () => {
		// Guarded so a portal node reused by a later surface keeps that surface's
		// entry rather than this one's teardown clearing it.
		if (portalReferences.get(portal) !== getReference) return

		portalReferences.delete(portal)

		publishedCount--
	}
}

/** Whether the surface in `portal` published a reference at all. @internal */
export function hasPortalReference(portal: Element): boolean {
	return portalReferences.has(portal)
}

/**
 * The floating portal a press landed in, when that portal is not `container`'s
 * own — the press is in some *other* surface, which may or may not be one this
 * container owns.
 *
 * @internal
 */
export function foreignFloatingPortal(container: Element, target: Node): Element | null {
	const targetPortal = closestFloatingPortal(target)

	if (!targetPortal || targetPortal === closestFloatingPortal(container)) return null

	return targetPortal
}

/**
 * Whether the surface in `portal` was opened from inside `container`. The one
 * definition of the descendancy rule: a surface that published no reference has
 * no descendancy to claim.
 *
 * @internal
 */
export function referenceOpenedWithin(container: Element, portal: Element): boolean {
	const reference = portalReferences.get(portal)?.()

	return reference != null && container.contains(reference)
}

/**
 * Whether a press at `target` landed in a floating surface opened from within
 * `container`, for a boundary that is not itself a floating panel.
 *
 * @remarks
 * An `Overlay` (Dialog, Sheet, Drawer) dismisses through `useDismissable`, whose
 * boundary is a plain DOM subtree with no floating reference of its own. A menu
 * or popover opened from inside it teleports into a sibling portal, so DOM
 * containment alone reads every press in it as outside and closes the surface
 * that owns it — taking the menu with it before the click that opened it can
 * land.
 *
 * `pressLandsInNestedSurface` asks the same question for a floating panel, and
 * adds a fallback for a portal that published nothing; this one has no such
 * fallback, because an `Overlay` has no reference to compare against.
 *
 * @internal
 */
export function pressLandsInSurfaceOpenedWithin(container: Element, target: Node): boolean {
	if (publishedCount === 0) return false

	const portal = foreignFloatingPortal(container, target)

	return portal != null && referenceOpenedWithin(container, portal)
}
