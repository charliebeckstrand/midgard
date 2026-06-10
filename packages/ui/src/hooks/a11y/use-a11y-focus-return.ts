'use client'

import { useCallback, useEffect, useRef } from 'react'

export type A11yFocusReturn = {
	/** Ref callback for the trigger; captures the node to restore focus to on close. */
	captureTrigger: (node: HTMLElement | null) => void
	/** Suppress the next close's focus restore (e.g. an outside press that should follow the pointer). */
	skipNextRefocus: () => void
}

/**
 * Focus restoration for a floating panel whose focus manager runs with
 * `returnFocus={false}`. On close it focuses the captured trigger, unless
 * `skipNextRefocus` was called for that close. `captureTrigger` captures the
 * trigger node; floating-ui's `domReference` ref is not reliably populated.
 */
export function useA11yFocusReturn(open: boolean): A11yFocusReturn {
	const triggerRef = useRef<HTMLElement | null>(null)

	const skip = useRef(false)

	const wasOpen = useRef(open)

	const captureTrigger = useCallback((node: HTMLElement | null) => {
		triggerRef.current = node
	}, [])

	const skipNextRefocus = useCallback(() => {
		skip.current = true
	}, [])

	useEffect(() => {
		if (wasOpen.current && !open && !skip.current) {
			const reference = triggerRef.current

			if (reference) {
				const focusable = reference.querySelector<HTMLElement>('button, [tabindex]')

				;(focusable ?? reference).focus()
			}
		}

		skip.current = false

		wasOpen.current = open
	}, [open])

	return { captureTrigger, skipNextRefocus }
}
