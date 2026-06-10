/**
 * Stack of open Escape-dismissable surfaces. Layered dismissal closes one
 * surface per Escape press, innermost first: a menu inside a dialog, or a
 * dialog over a sheet, each consume their own press instead of every open
 * surface closing at once. Surfaces register on open, so stack order is
 * open order and the topmost layer alone responds to Escape.
 */
const layers: object[] = []

/** Push `layer` onto the dismiss stack; returns the matching unregister fn. */
export function registerDismissLayer(layer: object): () => void {
	layers.push(layer)

	return () => {
		const idx = layers.lastIndexOf(layer)

		if (idx !== -1) layers.splice(idx, 1)
	}
}

/** True when `layer` is the topmost layer on the dismiss stack. */
export function isTopDismissLayer(layer: object): boolean {
	return layers[layers.length - 1] === layer
}
