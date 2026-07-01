'use client'

import { useEffect } from 'react'

// Reference count shared by overlapping drags (concurrent contexts or sensors).
let grabbingCount = 0

// The single injected rule, created by the first holder and removed by the last.
let grabbingStyle: HTMLStyleElement | null = null

/** Injects the global grabbing rule on the first active drag, saving it to tear down. @internal */
function acquireGrabbingCursor() {
	if (typeof document === 'undefined') return

	if (grabbingCount === 0) {
		const style = document.createElement('style')

		style.dataset.grabbingCursor = ''

		// A universal `!important` rule so the grabbing cursor wins over whatever
		// element the pointer sits on. dnd-kit tracks a drag through document-level
		// listeners and never sets a cursor itself, so absent this the element under
		// the pointer — a reflowing sibling, a gap, the surrounding dialog — decides
		// the cursor, and a wrapper-scoped class can't reach past its own subtree.
		style.textContent = '*{cursor:grabbing !important}'

		document.head.append(style)

		grabbingStyle = style
	}

	grabbingCount++
}

/** Removes the rule once the last active drag releases. @internal */
function releaseGrabbingCursor() {
	if (typeof document === 'undefined') return

	grabbingCount--

	if (grabbingCount === 0) {
		grabbingStyle?.remove()

		grabbingStyle = null
	}
}

/**
 * Forces the grabbing cursor across the whole document while `active` is true —
 * held for the span of a drag. Overlapping holders are reference-counted: the
 * rule lifts only when the last drag releases.
 *
 * @remarks A pointer-driven library (dnd-kit) sets no cursor of its own and never
 * captures the pointer, so mid-drag the cursor is decided by whatever element
 * sits under the pointer — a reflowing sibling, a gap, the enclosing dialog — not
 * the item being dragged. A class scoped to the dragged node therefore flickers
 * back to the default the moment the pointer leaves it. This injects a single
 * universal `!important` rule into `<head>` so the grabbing cursor covers the
 * entire viewport for the drag's duration, beating each element's own cursor
 * (`grab` handles, `text` inputs, `pointer` links). Acquired in an effect and
 * released on cleanup or when `active` goes false — so it clears on both drop and
 * cancel; no-ops during SSR.
 */
export function useGrabbingCursor(active: boolean): void {
	useEffect(() => {
		if (!active) return

		acquireGrabbingCursor()

		return releaseGrabbingCursor
	}, [active])
}
