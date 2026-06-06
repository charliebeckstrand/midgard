'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Moves focus to `ref.current` whenever `when` flips true — initial focus for a
 * panel that opens, a step that activates, etc. The target needs to be
 * focusable (e.g. `tabIndex={-1}`); when `when` is false this is a no-op, so
 * toggling it false then true re-focuses.
 */
export function useA11yAutoFocus(ref: RefObject<HTMLElement | null>, when: boolean) {
	useEffect(() => {
		if (when) {
			ref.current?.focus()
		}
	}, [when, ref])
}
