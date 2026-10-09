'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'

/** What {@link useQueryRemovalFocus} gives: the register of the focus targets and the call that moves focus after a removal. @internal */
type QueryRemovalFocus<E extends HTMLElement> = {
	/** Enrolls the element of a target under its key, or drops the key on `null`. */
	register: (key: string, el: E | null) => void
	/**
	 * Moves focus to the first live target of `keys` after the removal commits.
	 * Each call takes a new array, so a second removal runs the effect again.
	 */
	focusFirst: (keys: string[]) => void
}

/**
 * Focus after a removal (WCAG 2.4.3). Each control registers its element by
 * key. A removal gives its ladder of keys, best first, and the effect focuses
 * the first target that is connected and not disabled, after the removed node
 * unmounts. The query chips and the query builder each keep their own ladder.
 *
 * @param onExhausted - Runs when no target of the ladder can take focus.
 * @internal
 */
export function useQueryRemovalFocus<E extends HTMLElement>(
	onExhausted?: () => void,
): QueryRemovalFocus<E> {
	const targets = useRef(new Map<string, E>())

	const register = useCallback((key: string, el: E | null) => {
		if (el) targets.current.set(key, el)
		else targets.current.delete(key)
	}, [])

	// The ladder stays set after the move. A clear would add a render that
	// remounts the control that just took focus.
	const [pending, setPending] = useState<string[] | null>(null)

	const exhausted = useStableEvent(() => onExhausted?.())

	useEffect(() => {
		if (!pending) return

		for (const key of pending) {
			const el = targets.current.get(key)

			if (el?.isConnected && !el.matches(':disabled')) {
				el.focus()

				return
			}
		}

		exhausted()
	}, [pending, exhausted])

	return { register, focusFirst: setPending }
}
