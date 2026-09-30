import type { ReactNode } from 'react'

/**
 * The classes of the expansion span. The span holds the floor in a custom
 * property, so the width and the height read one value. Each axis takes the
 * smaller of the floor and the host size plus the gap to a neighbor.
 */
const area = [
	'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto',
	'[--touch-target-floor:1.5rem] pointer-coarse:[--touch-target-floor:2.75rem]',
	'w-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-x,var(--touch-target-floor))))]',
	'h-[max(100%,min(var(--touch-target-floor),100%_+_var(--touch-target-gap-y,var(--touch-target-floor))))]',
].join(' ')

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
 * Two small hosts side by side can sit closer than the floor. Their hit areas
 * then overlap, and the later host takes all of the overlap. A container that
 * puts hosts in a row sets `--touch-target-gap-x` to the space between two
 * adjacent hosts. A container that stacks hosts sets `--touch-target-gap-y` in
 * the same way, and a grid or a row that wraps sets both. Each hit area then
 * goes at most half of that space past its host on each side of that axis.
 * Adjacent hit areas meet at the midpoint and do not overlap, and hosts of one
 * size get hit areas of one size. An axis with no property keeps the floor.
 *
 * The properties inherit, so they cap each `TouchTarget` in the container,
 * the controls of a nested input included. A value under the real space is
 * safe, because it only makes the hit areas smaller.
 *
 * `__tests__/primitives/touch-target.test.tsx` asserts the floor classes under
 * jsdom. `__tests__/browser/touch-target-geometry.test.tsx` measures the
 * 24px activation region in Chromium on a fine pointer, and the split between
 * two adjacent hosts on each axis. `__tests__/browser/hit-area-overlap.test.tsx`
 * sets the 44px floor on each span, because the suite cannot match a coarse
 * pointer. It then finds each pair of hit areas that overlap. Axe cannot stand
 * in for these pins, because its target-size rule measures the host's own
 * border-box and never sees the span.
 */
export function TouchTarget({ children }: { children: ReactNode }) {
	return (
		<>
			<span data-slot="touch-target" className={area} aria-hidden="true" />
			{children}
		</>
	)
}
