'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Manages focus restoration for a floating panel whose `FloatingFocusManager`
 * runs with `returnFocus={false}`. On close it focuses the captured trigger —
 * unless `skipNextRefocus` was called for that close (e.g. an outside press,
 * where focus should follow the pointer rather than snap back).
 *
 * floating-ui's own `domReference` ref is not reliably populated, so the
 * trigger node is captured through `captureTrigger`.
 */
export function useDatePickerRefocus(open: boolean) {
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
