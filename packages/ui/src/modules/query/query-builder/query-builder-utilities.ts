import type { QueryGroup } from '../engine/types'

/**
 * A place focus can be sent: a node's own control (`node`, e.g. its remove
 * button) or a group's "add rule" control (`add`).
 */
export type FocusTarget = { kind: 'node'; id: string } | { kind: 'add'; groupId: string }

/**
 * Ordered focus candidates for the neighbourhood around node `id`, used when
 * removal takes `id` out of the tree; focus then moves to a neighbour instead
 * of dropping to <body> (WCAG 2.4.3).
 *
 * Returns several candidates, best first, and leaves the choice to the
 * caller, which focuses the first that resolves to a live element. A
 * disabled, unmounted, or otherwise unfocusable target degrades to the next
 * one. The ladder follows the APG list pattern: previous sibling, then next
 * sibling, then the enclosing group's add control, then the same for each
 * ancestor on the way to the root. Empty when `id` isn't found.
 */
export function findFocusTarget(tree: QueryGroup, id: string): FocusTarget[] {
	const index = tree.children.findIndex((child) => child.id === id)

	if (index !== -1) {
		const candidates: FocusTarget[] = []

		const prev = tree.children[index - 1]
		const next = tree.children[index + 1]

		if (prev) candidates.push({ kind: 'node', id: prev.id })

		if (next) candidates.push({ kind: 'node', id: next.id })

		candidates.push({ kind: 'add', groupId: tree.id })

		return candidates
	}

	for (const child of tree.children) {
		if (child.type === 'group') {
			const inner = findFocusTarget(child, id)

			// Found inside a nested group: this group's add control (and, by
			// recursion, its ancestors') follows the nested options.
			if (inner.length > 0) return [...inner, { kind: 'add', groupId: tree.id }]
		}
	}

	return []
}

/**
 * Stable string keys under which focusable controls register themselves,
 * matching a `FocusTarget` to a live element without touching the DOM.
 */
export const focusKeys = {
	node: (id: string) => `node:${id}`,
	add: (groupId: string) => `add:${groupId}`,
}

export function focusKeyOf(target: FocusTarget): string {
	return target.kind === 'node' ? focusKeys.node(target.id) : focusKeys.add(target.groupId)
}
