'use client'

/**
 * One open overlay: the portal node that holds it, its rank in the order of
 * the opens, and whether it seals the page.
 */
type StackEntry = { node: HTMLElement; rank: number; modal: boolean }

/** The open overlays, by the object that owns each one. */
const entries = new Map<object, StackEntry>()

/** The rank of the last open. */
let opened = 0

/**
 * The rank of a new open: higher than the rank of each open before it.
 *
 * @internal
 */
export function nextOverlayRank(): number {
	opened += 1

	return opened
}

/**
 * The floating-ui portal node that holds `panel`, or `null`.
 *
 * An overlay that renders in place, before the hydration, has no portal node.
 * The node must be one that floating-ui made, because the stack moves it, and
 * React must not hold it as a child.
 *
 * @internal
 */
export function overlayNode(panel: HTMLElement | null): HTMLElement | null {
	const node = panel?.closest('[data-slot="portal"]')?.parentElement ?? null

	return node?.hasAttribute('data-floating-ui-portal') ? node : null
}

/**
 * The portal nodes of the overlays that opened after `rank`.
 *
 * @internal
 */
export function overlaysAbove(rank: number | null): HTMLElement[] {
	if (rank === null) return []

	return [...entries.values()].filter((entry) => entry.rank > rank).map((entry) => entry.node)
}

/**
 * Puts the open overlays in the order of their opens, and makes each overlay
 * under a modal overlay inert.
 *
 * The overlays share one rung of the `sou` ladder, so the DOM order of their
 * portal nodes decides which one paints on top. An open appends a new node, so
 * that order is usually the order of the opens. A Suspense boundary or an
 * `<Activity>` that hides and reveals two open overlays breaks it: the reveal
 * appends each node again, in the order of the React tree.
 *
 * A move takes the lower node, and puts it before the node above it. The top
 * node holds the focus, so it does not move.
 */
function restack(): void {
	const held = [...entries.values()].sort((a, b) => a.rank - b.rank)

	for (let at = held.length - 2; at >= 0; at -= 1) {
		const lower = held[at]

		const upper = held[at + 1]

		if (lower === undefined || upper === undefined) continue

		const parent = upper.node.parentNode

		if (parent === null || lower.node.parentNode !== parent) continue

		if (upper.node.compareDocumentPosition(lower.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
			parent.insertBefore(lower.node, upper.node)
		}
	}

	// The focus manager of each overlay marks the page outside it, but only once,
	// when the overlay opens. A reveal runs the marks again in the order of the
	// React tree, so a lower overlay can be left live under a higher one. The host
	// of the portal is the target, because floating-ui counts its own marks on the
	// portal node.
	for (const entry of held) {
		const covered = held.some((other) => other.modal && other.rank > entry.rank)

		entry.node.querySelector(':scope > [data-slot="portal"]')?.toggleAttribute('inert', covered)
	}
}

/**
 * Adds an open overlay to the stack, and puts the stack in order.
 *
 * @param owner - The object that owns the entry, such as a ref of the overlay.
 * @returns A function that removes the entry and puts the rest in order.
 * @internal
 */
export function stackOverlay(owner: object, entry: StackEntry): () => void {
	entries.set(owner, entry)

	restack()

	return () => {
		entries.delete(owner)

		// The host of the removed overlay stays inert no longer. It is closed or
		// hidden, and its own close marks it inert where that applies.
		entry.node.querySelector(':scope > [data-slot="portal"]')?.removeAttribute('inert')

		restack()
	}
}
