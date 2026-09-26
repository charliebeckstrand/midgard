/**
 * Stack of open Escape-dismissable surfaces. Layered dismissal closes one
 * surface per Escape press, innermost first. A menu inside a dialog, or a
 * dialog over a sheet, each consume their own press instead of every open
 * surface closing at once. The topmost layer alone responds to Escape.
 *
 * A layer registers from an effect, and React runs the effects of one commit
 * child first. A parent and a child that open in the same commit therefore
 * register child first, which puts the parent on top. An `order` from
 * {@link nextDismissOrder} fixes this. The render that opens a layer takes the
 * order, and React renders a parent before its child and an earlier open
 * before a later open. The stack sorts on that order.
 */
type DismissEntry = { layer: object; order: number | undefined }

const layers: DismissEntry[] = []

let lastOrder = 0

/**
 * Gives the next open order for {@link registerDismissLayer}. Call it in the
 * render that opens a layer, so that the order follows the render order.
 */
export function nextDismissOrder(): number {
	lastOrder += 1

	return lastOrder
}

/**
 * Puts `layer` on the dismiss stack; returns the matching unregister fn.
 *
 * @param order - The open order from {@link nextDismissOrder}. The layer goes
 * below each layer with a higher order. With no order, the layer goes on top,
 * and no later layer goes below it.
 */
export function registerDismissLayer(layer: object, order?: number): () => void {
	const entry: DismissEntry = { layer, order }

	let at = layers.length

	while (order !== undefined && at > 0) {
		const below = layers[at - 1]?.order

		if (below === undefined || below < order) break

		at -= 1
	}

	layers.splice(at, 0, entry)

	return () => {
		const idx = layers.indexOf(entry)

		if (idx !== -1) layers.splice(idx, 1)
	}
}

/** True when `layer` is the topmost layer on the dismiss stack. */
export function isTopDismissLayer(layer: object): boolean {
	return layers.at(-1)?.layer === layer
}
