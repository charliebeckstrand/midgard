import { createEmitter } from './emitter'
import { closestFloatingPortal, portalReference } from './floating-portal-registry'

/**
 * Stack of the open overlays that cover a box of the page, and the question
 * whether one of them covers the anchor of a float.
 *
 * @remarks
 * A float (tooltip, popover, menu) paints on the `float` rung of the stacking
 * order, above each overlay, because a float often opens from inside a panel.
 * The rung alone cannot tell where the anchor of the float is. A float that is
 * anchored under an open Sheet thus painted over the Sheet. The stack gives the
 * order of the overlays, and `useFloatingPanel` hides a float while an overlay
 * above its anchor is open.
 *
 * The DOM order cannot give this order. Under a `<UIProvider>` with a
 * `portalContainer`, each portal is a sibling node of one container, and that
 * container can come before the page.
 */

/** An open overlay that covers a box of the page. @internal */
export type OverlayLayer = {
	/** The root node of the overlay, which holds the backdrop and the panel. */
	node: Element
	/** The container that the overlay covers, or `null` for the viewport. */
	scope: Element | null
	/** The regions that the overlay does not cover, such as the `Chrome` regions. */
	exempt: () => Element[]
}

/** The open layers, from the lowest to the highest. */
const layers: OverlayLayer[] = []

const changes = createEmitter()

/**
 * Puts `layer` on the top of the stack. Returns the call that removes it.
 *
 * @internal
 */
export function registerOverlayLayer(layer: OverlayLayer): () => void {
	layers.push(layer)

	changes.emit()

	return () => {
		const index = layers.indexOf(layer)

		if (index === -1) return

		layers.splice(index, 1)

		changes.emit()
	}
}

/**
 * Subscribes to the changes of the stack. Returns the unsubscribe call.
 *
 * @internal
 */
export function subscribeOverlayLayers(listener: () => void): () => void {
	return changes.subscribe(listener)
}

/** Whether `layer` covers `element`, which is not in the layer. */
function covers(layer: OverlayLayer, element: Element): boolean {
	if (layer.scope && !layer.scope.contains(element)) return false

	return !layer.exempt().some((region) => region.contains(element))
}

/**
 * Whether an open overlay is above `anchor`, the anchor of a float.
 *
 * The anchor is in a layer when the node of the layer holds it. When a layer
 * holds a layer of its own, the higher layer holds the anchor. Only a layer
 * above that layer can cover the anchor. An anchor in a floating surface
 * belongs to the place that the surface opened from, so the search goes on
 * from the reference of the surface. An anchor in no layer and in no surface
 * is on the page, and each layer can cover it.
 *
 * A surface that published no reference can belong to any layer. Its anchors
 * are not covered, and their floats keep the `float` rung. So are the anchors
 * of surfaces whose references make a loop.
 *
 * @internal
 */
export function isCoveredByOverlay(anchor: Element): boolean {
	if (layers.length === 0) return false

	let element: Element = anchor

	const visited = new Set<Element>()

	for (;;) {
		const index = layers.findLastIndex((layer) => layer.node.contains(element))

		if (index !== -1) return layers.slice(index + 1).some((layer) => covers(layer, element))

		const portal = closestFloatingPortal(element)

		if (!portal) return layers.some((layer) => covers(layer, element))

		if (visited.has(portal)) return false

		visited.add(portal)

		const reference = portalReference(portal)

		if (!reference) return false

		element = reference
	}
}
