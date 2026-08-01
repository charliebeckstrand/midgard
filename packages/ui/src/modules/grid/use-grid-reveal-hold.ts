'use client'

import type { TransitionEvent } from 'react'
import { useMediaQuery } from '../../hooks/use-media-query'
import { type MountHold, useMountHold } from '../../primitives/mount'

/** The reveal's animated property; a `transitionend` for anything else is not the collapse landing. */
const REVEAL_PROPERTY = 'grid-template-rows'

/** What {@link useGridRevealHold} hands a collapsible row. */
export type GridRevealHold = {
	/** Pass to `<Hold>` around the row. */
	hold: MountHold
	/** Attach to the row; `transitionend` bubbles up from the cells that animate. */
	onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void
}

/**
 * Holds a collapsible grid row so a collapsed one rests in
 * `<Activity mode="hidden">` instead of rendering behind a zero-height reveal.
 *
 * @remarks
 * A grouped body stands virtualization down, so every leaf, detail, and total
 * row is mounted whatever its group's expansion, and each body render walks all
 * of them. Resting the collapsed ones moves that work off the visible commit —
 * it still runs, at the lower priority a hidden Activity renders under, but the
 * commit the user waits on carries the expanded rows alone.
 *
 * The hold has to wait for the reveal, since `display: none` cannot tween
 * `grid-template-rows`: hiding on the toggle would snap a collapsing row away
 * instead of letting it shrink. The landing arrives as a `transitionend`
 * bubbling from the cells that animate — one per cell, but resting is
 * idempotent. Under `prefers-reduced-motion` the recipe drops the transition
 * (`motion-reduce:transition-none`), so no event is coming and the row rests on
 * the toggle itself, which is what an instant collapse wants anyway. That is
 * read live rather than through motion's `useReducedMotion`, which samples the
 * query once at mount: a session that turns reduced motion on afterwards would
 * otherwise keep waiting for a landing the CSS had already stopped sending, and
 * no row would ever rest again.
 *
 * Rows always exist here (`mount="always"`) — the module renders every leaf of
 * every group, and this changes only whether a collapsed one is live.
 *
 * @param expanded - Whether the row's group is open.
 * @returns The row's {@link GridRevealHold}.
 * @internal
 */
export function useGridRevealHold(expanded: boolean): GridRevealHold {
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const hold = useMountHold(expanded, 'always', { defer: !reducedMotion })

	return {
		hold,
		onTransitionEnd: (event) => {
			if (event.propertyName === REVEAL_PROPERTY) hold.rest()
		},
	}
}
