'use client'

/**
 * Calls `update` when the scroll extent of `node` can change: on a resize of
 * the node or of a direct child, and on a child addition or removal. The call
 * does not run `update` on attach. The caller measures first.
 *
 * @param node - The scroll container to watch.
 * @param update - The measurement to run again.
 * @returns A function that stops the watch.
 * @internal
 */
export function observeScrollExtent(node: HTMLElement, update: () => void): () => void {
	const resizes = new ResizeObserver(update)

	const observeChildren = () => {
		resizes.disconnect()

		resizes.observe(node)

		for (const child of node.children) resizes.observe(child)
	}

	observeChildren()

	// Children added or removed after mount change the scroll extent without
	// resizing any observed element; re-seat the observer and re-measure.
	const mutations = new MutationObserver(() => {
		observeChildren()

		update()
	})

	mutations.observe(node, { childList: true })

	return () => {
		mutations.disconnect()

		resizes.disconnect()
	}
}
