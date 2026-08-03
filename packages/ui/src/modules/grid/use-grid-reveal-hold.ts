'use client'

import { type TransitionEvent, useLayoutEffect, useState } from 'react'
import { useMediaQuery } from '../../hooks/use-media-query'
import { type MountHold, useMountHold } from '../../primitives/mount'

/** The reveal's animated property; a `transitionend` for anything else is not the collapse landing. */
const REVEAL_PROPERTY = 'grid-template-rows'

/** What {@link useGridRevealHold} hands a collapsible row. */
export type GridRevealHold = {
	/** Pass to `<Hold>` around the row. */
	hold: MountHold
	/**
	 * Whether the reveal renders open — the `data-open` its track tweens on. It
	 * trails `expanded` by one commit as the row wakes, so drive the track from
	 * this and the row's semantics (`aria-hidden`, `inert`) from `expanded`.
	 */
	open: boolean
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
 * The rest is also why {@link GridRevealHold.open} exists apart from `expanded`.
 * A transition needs two rendered styles to run between, and a resting row has
 * none: it sits at `display: none`, so a wake that lifted the hold and opened
 * the track in one commit would give the browser its first style already open,
 * and the row would snap. The wake therefore takes two commits — the row comes
 * back on screen at the closed track, a forced style flush records that, and
 * only then does the track open. A collapse keeps its single commit, since the
 * row it starts from is on screen already, and so does an open under reduced
 * motion, which has no transition to prime.
 *
 * @param expanded - Whether the row's group is open.
 * @returns The row's {@link GridRevealHold}.
 * @internal
 */
export function useGridRevealHold(expanded: boolean): GridRevealHold {
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const hold = useMountHold(expanded, 'always', { defer: !reducedMotion })

	const [open, setOpen] = useState(expanded)

	// A collapse closes the track in the commit the toggle lands in, so the reveal
	// starts to shrink from the row's first closed frame — the same edge that
	// `aria-hidden` and `inert` take. Adjusted during render, so no commit passes
	// with the row closed and its track still open.
	if (!expanded && open) setOpen(false)

	// An open takes that single commit too when the recipe carries no transition
	// to prime. Without this, a reduced-motion session pays the wake below — a
	// reflow and a second pass over the group — for a cue that never animates.
	if (expanded && !open && reducedMotion) setOpen(true)

	const opening = expanded && !open

	useLayoutEffect(() => {
		if (!opening) return

		// This commit lifted the rest, so the row is back on screen at the closed
		// track — but the browser has not read that style yet, and the open one is
		// a render away. Force the flush that records it, and the transition has a
		// style to run from. Layout is clean for the other rows of a group that
		// wakes together, so the flush costs one reflow for the whole toggle.
		void document.documentElement.offsetHeight

		setOpen(true)
	}, [opening])

	return {
		hold,
		open,
		onTransitionEnd: (event) => {
			if (event.propertyName === REVEAL_PROPERTY) hold.rest()
		},
	}
}
