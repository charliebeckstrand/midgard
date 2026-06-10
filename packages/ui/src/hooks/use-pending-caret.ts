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

	useLayoutEffect(() => {
		const target = pendingCaretRef.current

		if (target === null) return

		pendingCaretRef.current = null

		const el = inputRef.current

		if (el && document.activeElement === el) {
			el.setSelectionRange(target, target)
		}
	})

	const setCaret = (position: number | null) => {
		pendingCaretRef.current = position
	}

	return { ref, setCaret }
}
