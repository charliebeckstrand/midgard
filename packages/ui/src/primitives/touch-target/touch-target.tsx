import type { ReactNode } from 'react'

/**
 * Floors the hit target to the WCAG pointer-target minimums without altering
 * visual layout. That is 24 px on fine pointers (2.5.8) and 44 px on coarse
 * pointers (2.5.5). The invisible expansion sibling captures pointer events across the
 * floored area and, sitting inside the interactive host, forwards them to it
 * via event bubbling. For hosts already at or above the floor, `max(100%, …)`
 * collapses the span onto the host's own box and the floor is a no-op.
 *
 * The floor lives here, on the hit area, and never on the host's box. A box
 * floor (e.g. `min-w-6 min-h-6`) inflates everything that paints the box —
 * focus ring, hover wash, affix lockstep — on sub-24px hosts. Icon-only bare
 * buttons are one. An undersized box with a floored hit area keeps visuals on
 * icon + padding at every size, and stays compliant. WCAG 2.5.8 measures the
 * activation region, not the visible bounds.
 *
 * `__tests__/primitives/touch-target.test.tsx` asserts the floor classes under
 * jsdom. `__tests__/browser/touch-target-geometry.test.tsx` measures the
 * activation region in Chromium, on a fine and an emulated coarse pointer. Axe
 * cannot stand in for that pin, because its target-size rule measures the
 * host's own border-box and never sees the span.
 */
export function TouchTarget({ children }: { children: ReactNode }) {
	return (
		<>
			<span
				className="absolute left-1/2 top-1/2 size-[max(100%,1.5rem)] pointer-coarse:size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
				aria-hidden="true"
			/>
			{children}
		</>
	)
}
