'use client'

import { type Ref, useLayoutEffect, useRef } from 'react'
import { useComposedRef } from './use-composed-ref'

/**
 * Caret-preserving plumbing for formatted text inputs. Spread the returned
 * `ref` onto the input and call `setCaret(pos)` (e.g. from `onChange`)
 * with the caret index measured against the *formatted* value; a layout effect
 * re-applies it after render, keeping the cursor in place when formatting
 * inserts separators. Restores only while the input holds focus.
 *
 * @param externalRef - Optional input ref composed with the internal one.
 * @returns `{ ref, setCaret }`. Spread `ref` onto the input; `setCaret(pos)`
 * queues a caret restore to `pos` against the formatted value (pass `null` to
 * cancel).
 */
export function usePendingCaret(externalRef?: Ref<HTMLInputElement>) {
	const inputRef = useRef<HTMLInputElement | null>(null)

	const pendingCaretRef = useRef<number | null>(null)

	const ref = useComposedRef(inputRef, externalRef)

	const flush = () => {
		const target = pendingCaretRef.current

		if (target === null) return

		pendingCaretRef.current = null

		const el = inputRef.current

		if (el && document.activeElement === el) {
			el.setSelectionRange(target, target)
		}
	}

	// Consumes the pending caret on the commit that re-rendered the input.
	useLayoutEffect(flush)

	const setCaret = (position: number | null) => {
		pendingCaretRef.current = position

		// A commit isn't guaranteed: a controlled consumer may reject the value,
		// or formatting may collapse to the unchanged string (React then restores
		// the DOM value, pushing the caret to the end, without re-rendering).
		// The microtask runs after that restore and no-ops when the layout effect
		// already consumed the caret, so the pending value never leaks into a
		// later unrelated commit.
		if (position !== null) queueMicrotask(flush)
	}

	return { ref, setCaret }
}
