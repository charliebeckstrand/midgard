'use client'

import { type Ref, useLayoutEffect, useRef } from 'react'
import { useComposedRef } from './use-composed-ref'

/**
 * Caret-preserving plumbing for formatted text inputs. Spread the returned
 * `ref` onto the input and call `setCaret(pos)` (e.g. from `onChange`)
 * with the caret index measured against the *formatted* value; a layout effect
 * re-applies it after render, keeping the cursor in place when formatting
 * inserts separators. Restores only while the input holds focus.
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
		// the DOM value, shoving the caret to the end, without re-rendering).
		// The microtask runs after that restore; when a commit did happen, the
		// layout effect has already consumed the caret and this no-ops. Either
		// way the pending value never leaks into a later unrelated commit.
		if (position !== null) queueMicrotask(flush)
	}

	return { ref, setCaret }
}
