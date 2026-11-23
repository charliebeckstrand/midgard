'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { FOCUSABLE_SELECTOR, getTabbableElements } from '../../utilities/focusable-selector'
import type { QueryGroup } from './engine/types'

/** What {@link useQueryFocus} gives: the register of the focus targets and the calls that move focus after an edit. @internal */
type QueryFocus<E extends HTMLElement> = {
	/** Enrolls the element of a target under its key, or drops the key on `null`. */
	register: (key: string, el: E | null) => void
	/**
	 * Moves focus to the first live target of `keys` once the node `id` leaves
	 * the tree. A second call replaces an edit that still waits.
	 */
	focusFirst: (id: string, keys: string[]) => void
	/**
	 * Moves focus to the first live target of `keys` once the node `id` enters
	 * the tree. A second call replaces an edit that still waits.
	 */
	focusAdded: (id: string, keys: string[]) => void
}

/**
 * An edit that waits to move focus: the id of the node, whether the edit adds
 * the node or removes it, and the ladder of keys.
 *
 * @internal
 */
type PendingFocus = { id: string; added: boolean; keys: string[] }

/** Whether `id` names a node below `group`. @internal */
function holdsNode(group: QueryGroup, id: string): boolean {
	return group.children.some(
		(child) => child.id === id || (child.type === 'group' && holdsNode(child, id)),
	)
}

/**
 * The element that takes the focus for a target: the target itself when it is
 * in the tab order, else its first tabbable descendant. A rule registers the
 * box of its controls, because a `Select` gives no ref.
 */
function focusTarget(el: HTMLElement): HTMLElement | undefined {
	if (el.matches(FOCUSABLE_SELECTOR) && !el.matches(':disabled')) return el

	return getTabbableElements(el)[0]
}

/**
 * Focus after a removal or an add (WCAG 2.4.3). Each control registers its
 * element by key. An edit gives the id of its node and its ladder of keys, best
 * first. Once the node is gone from `tree`, or once it is in `tree` for an add,
 * the effect focuses the first target that is connected and can take focus.
 *
 * @remarks
 * A controlled owner can refuse an edit or apply it in a later update. Until
 * the tree shows the edit, focus stays on the control that the user pressed.
 * When a later tree shows it, focus moves then, and the ladder skips a target
 * that unmounted in the same update.
 *
 * The effect runs after the effects of the controls in the tree, because React
 * runs the effects of a child first. So when a menu item adds a node, the menu
 * gives the focus back to its trigger first, and this effect then moves it to
 * the new node.
 *
 * @param tree - The tree that the removal edits.
 * @param onExhausted - Runs when no target of the ladder can take focus.
 * @internal
 */
export function useQueryFocus<E extends HTMLElement>(
	tree: QueryGroup,
	onExhausted?: () => void,
): QueryFocus<E> {
	const targets = useRef(new Map<string, E>())

	const register = useCallback((key: string, el: E | null) => {
		if (el) targets.current.set(key, el)
		else targets.current.delete(key)
	}, [])

	// A ref and not a state: the edit draws nothing. The tree that shows the
	// edit renders, and its effect moves focus and clears the edit.
	const pending = useRef<PendingFocus | null>(null)

	const exhausted = useStableEvent(() => onExhausted?.())

	useEffect(() => {
		const edit = pending.current

		if (edit === null || holdsNode(tree, edit.id) !== edit.added) return

		pending.current = null

		for (const key of edit.keys) {
			const el = targets.current.get(key)

			const target = el?.isConnected ? focusTarget(el) : undefined

			if (target) {
				target.focus()

				return
			}
		}

		exhausted()
	}, [tree, exhausted])

	const focusFirst = useCallback((id: string, keys: string[]) => {
		pending.current = { id, added: false, keys }
	}, [])

	const focusAdded = useCallback((id: string, keys: string[]) => {
		pending.current = { id, added: true, keys }
	}, [])

	return { register, focusFirst, focusAdded }
}
