'use client'

import type React from 'react'
import { useCallback, useRef } from 'react'

/**
 * Arrow-key navigation between a primary element and a secondary action.
 *
 * The action element is kept out of the tab order (`tabIndex={-1}`).
 * Pressing ArrowRight on the primary element focuses the action;
 * pressing ArrowLeft on the action returns focus to the primary element.
 *
 * For input elements, ArrowRight only triggers when the cursor is at the
 * end of the value.
 */
export function useArrowAction<A extends HTMLElement = HTMLElement>() {
	const actionRef = useRef<A>(null)

	const primaryElRef = useRef<HTMLElement>(null)

	const onPrimaryKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== 'ArrowRight') return

		const el = e.currentTarget

		if (el instanceof HTMLInputElement) {
			if (el.selectionStart !== el.value.length) return
		}

		e.preventDefault()

		primaryElRef.current = el as HTMLElement

		actionRef.current?.focus()
	}, [])

	const onActionKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== 'ArrowLeft') return

		e.preventDefault()

		const el = primaryElRef.current

		if (!el) return

		el.focus()

		if (el instanceof HTMLInputElement) {
			el.setSelectionRange(el.value.length, el.value.length)
		}
	}, [])

	return { actionRef, onPrimaryKeyDown, onActionKeyDown }
}
