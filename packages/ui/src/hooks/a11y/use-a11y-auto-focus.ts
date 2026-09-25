'use client'

import { useEffect } from 'react'

/**
 * Moves focus to `node` whenever `when` flips true: initial focus for a panel
 * that opens, a step that activates, etc. The target needs to be focusable
 * (e.g. `tabIndex={-1}`). A false `when` is a no-op, and a toggle from false to
 * true focuses again.
 *
 * @param node - The target, held as state from a callback ref
 * (`ref={setNode}`) rather than read from an object ref. A portaled panel
 * attaches a commit after `when` flips true. A `RefObject` reports that
 * arrival to nothing, so the probe would read `null` once and never run again.
 * @param when - Whether the target takes focus now.
 */
export function useA11yAutoFocus(node: HTMLElement | null, when: boolean) {
	useEffect(() => {
		if (when) node?.focus()
	}, [when, node])
}
