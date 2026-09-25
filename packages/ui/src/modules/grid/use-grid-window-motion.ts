'use client'

import { type RefObject, useCallback, useEffect, useState } from 'react'
import { useMediaQuery } from '../../hooks/use-media-query'
import type { GridRowMotion } from './engine/grid-items/items'
import { type GridWindowRecord, type GridWindowView, gridWindowView } from './use-grid-item-window'

/**
 * The time in milliseconds after which closing rows leave the item list, if no
 * reveal lands first. A row that leaves the window while it closes sends no
 * `transitionend`. The reveal itself takes 200 ms.
 */
const RELEASE_FALLBACK_MS = 1000

/**
 * What one toggle does to the motion of the rows.
 *
 * - `opened` holds the rows that open. Each loses the motion it had.
 * - `closing` holds the rows that close in view, each with its height.
 * - `entering` holds the rows that mount closed and open over the transition.
 *
 * @internal
 */
export type GridMotionChange<K> = {
	opened: K[]
	closing: [K, number][]
	entering: K[]
}

/**
 * How a body reads its toggles. `capture` takes a snapshot of the live source,
 * such as the expansion of each group. `same` tells whether the live source
 * still matches a snapshot, with no allocation. `toggle` maps a change of the
 * snapshot to a {@link GridMotionChange}.
 *
 * @internal
 */
export type GridMotionSource<L, S, K> = {
	capture: (live: L) => S
	same: (captured: S, live: L) => boolean
	toggle: (
		previous: S,
		live: L,
		context: { view: () => GridWindowView; reducedMotion: boolean },
	) => GridMotionChange<K>
}

/**
 * The state of {@link useGridWindowMotion}: the last snapshot and the motion
 * of each row. @internal
 */
type MotionState<S, K> = { captured: S; motions: ReadonlyMap<K, GridRowMotion> }

/** Whether any row in `motions` has `phase`. @internal */
function hasPhase<K>(motions: ReadonlyMap<K, GridRowMotion>, phase: GridRowMotion['phase']) {
	for (const motion of motions.values()) if (motion.phase === phase) return true

	return false
}

/** `motions` without the rows that have `phase`. @internal */
function withoutPhase<K>(
	motions: ReadonlyMap<K, GridRowMotion>,
	phase: GridRowMotion['phase'],
): ReadonlyMap<K, GridRowMotion> {
	return new Map([...motions].filter(([, motion]) => motion.phase !== phase))
}

/** Applies one {@link GridMotionChange} to `motions`. @internal */
function applyChange<K>(
	motions: ReadonlyMap<K, GridRowMotion>,
	change: GridMotionChange<K>,
): ReadonlyMap<K, GridRowMotion> {
	if (change.opened.length + change.closing.length + change.entering.length === 0) return motions

	const next = new Map(motions)

	for (const key of change.opened) next.delete(key)

	for (const [key, size] of change.closing) next.set(key, { phase: 'closing', size })

	for (const key of change.entering) next.set(key, { phase: 'entering' })

	return next
}

/**
 * Tracks the open and close motion of the rows of a windowed body. A body
 * supplies only its toggle mapping in `source`.
 *
 * @remarks The hook adjusts its state during render, so the commit that a
 * toggle starts already holds the closing and the entering rows. The entering
 * rows lose their motion after that commit, because a row that mounts later,
 * as the reader scrolls, mounts open. `release` drops a closing row once its
 * reveal lands, and a fallback timer drops each closing row that sends no
 * `transitionend`. The toggle reads the last committed window from `record`,
 * and it reads reduced motion live.
 *
 * @internal
 */
export function useGridWindowMotion<L, S, K>(
	live: L,
	source: GridMotionSource<L, S, K>,
	record: RefObject<GridWindowRecord>,
	scrollRef: RefObject<HTMLElement | null>,
) {
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const [state, setState] = useState<MotionState<S, K>>(() => ({
		captured: source.capture(live),
		motions: new Map(),
	}))

	if (!source.same(state.captured, live)) {
		const change = source.toggle(state.captured, live, {
			view: () => gridWindowView(record.current, scrollRef.current),
			reducedMotion,
		})

		setState({ captured: source.capture(live), motions: applyChange(state.motions, change) })
	}

	const { motions } = state

	const entering = hasPhase(motions, 'entering')

	const closing = hasPhase(motions, 'closing')

	// The entering rows mounted in the commit that the toggle started.
	useEffect(() => {
		if (entering) {
			setState((current) => ({ ...current, motions: withoutPhase(current.motions, 'entering') }))
		}
	}, [entering])

	// A closing row that left the window sends no `transitionend`. Each new
	// motion starts the timer again, so a row that starts to close late keeps
	// its full reveal.
	useEffect(() => {
		void motions

		if (!closing) return

		const timer = setTimeout(
			() =>
				setState((current) => ({ ...current, motions: withoutPhase(current.motions, 'closing') })),
			RELEASE_FALLBACK_MS,
		)

		return () => clearTimeout(timer)
	}, [closing, motions])

	const release = useCallback(
		(key: K) =>
			setState((current) => {
				if (current.motions.get(key)?.phase !== 'closing') return current

				const next = new Map(current.motions)

				next.delete(key)

				return { ...current, motions: next }
			}),
		[],
	)

	return { motions, release }
}
