'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { QueryGroup } from './engine/types'

/** What {@link useQueryRemovalFocus} gives: the register of the focus targets and the call that moves focus after a removal. @internal */
type QueryRemovalFocus<E extends HTMLElement> = {
	/** Enrolls the element of a target under its key, or drops the key on `null`. */
	register: (key: string, el: E | null) => void
	/**
	 * Moves focus to the first live target of `keys` once the node `id` leaves
	 * the tree. Each call makes a new removal, so a second removal runs the
	 * effect again.
	 */
	focusFirst: (id: string, keys: string[]) => void
}

/** A removal that waits to move focus: the id of the removed node and its ladder of keys. @internal */
type PendingRemoval = { id: string; keys: string[] }

/** Whether `id` names a node below `group`. @internal */
function holdsNode(group: QueryGroup, id: string): boolean {
	return group.children.some(
		(child) => child.id === id || (child.type === 'group' && holdsNode(child, id)),
	)
}

/**
 * Focus after a removal (WCAG 2.4.3). Each control registers its element by
 * key. A removal gives the id of its node and its ladder of keys, best first.
 * Once the node is gone from `tree`, the effect focuses the first target that
 * is connected and not disabled.
 *
 * @remarks
 * A controlled owner can refuse a removal or apply it in a later update. Until
 * the node leaves the tree, focus stays on the control that the user pressed.
 * When a later tree drops the node, focus moves then, and the ladder skips a
 * target that unmounted in the same update.
 *
 * @param tree - The tree that the removal edits.
 * @param onExhausted - Runs when no target of the ladder can take focus.
 * @internal
 */
export function useQueryRemovalFocus<E extends HTMLElement>(
	tree: QueryGroup,
	onExhausted?: () => void,
): QueryRemovalFocus<E> {
	const targets = useRef(new Map<string, E>())

	const register = useCallback((key: string, el: E | null) => {
		if (el) targets.current.set(key, el)
		else targets.current.delete(key)
	}, [])

	// The removal stays set after the move. A clear would add a render that
	// remounts the control that just took focus. The settled removal tells the
	// effect that a later tree has no focus to move.
	const [pending, setPending] = useState<PendingRemoval | null>(null)

	const settled = useRef<PendingRemoval | null>(null)

	const exhausted = useStableEvent(() => onExhausted?.())

	useEffect(() => {
		if (!pending || pending === settled.current || holdsNode(tree, pending.id)) return

		settled.current = pending

		for (const key of pending.keys) {
			const el = targets.current.get(key)

			if (el?.isConnected && !el.matches(':disabled')) {
				el.focus()

				return
			}
		}

		exhausted()
	}, [pending, tree, exhausted])

	const focusFirst = useCallback((id: string, keys: string[]) => setPending({ id, keys }), [])

	return { register, focusFirst }
}
