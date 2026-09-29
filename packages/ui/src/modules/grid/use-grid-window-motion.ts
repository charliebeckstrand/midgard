'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
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
 * The groups or keys that one change of the source opens and closes. A group
 * is what a body toggles: a group of rows, or one detail panel.
 *
 * @internal
 */
export type GridMotionFlips<G> = { opened: G[]; closed: G[] }

/**
 * How a body reads its toggles. `capture` takes a snapshot of the live source,
 * such as the expansion of each group. `same` tells whether the live source
 * still matches a snapshot, with no allocation. `flips` finds the groups that
 * open and close between a snapshot and the live source. It reads no window.
 * `resolve` maps the flips to a {@link GridMotionChange} from the last
 * committed window. With no window, which is the case under reduced motion,
 * it keeps no closing row and makes no row enter.
 *
 * @internal
 */
export type GridMotionSource<L, S, G, K> = {
	capture: (live: L) => S
	same: (captured: S, live: L) => boolean
	flips: (previous: S, live: L) => GridMotionFlips<G>
	resolve: (flips: GridMotionFlips<G>, view: GridWindowView | null) => GridMotionChange<K>
}

/**
 * A toggle that waits for the window: the live source, its snapshot, and the
 * flips from the applied source. @internal
 */
type PendingToggle<L, S, G> = { live: L; captured: S; flips: GridMotionFlips<G> }

/**
 * The state of {@link useGridWindowMotion}: the source that the rows render
 * from and its snapshot, the toggle that waits for the window, and the motion
 * of each row. @internal
 */
type MotionState<L, S, G, K> = {
	applied: L
	captured: S
	pending: PendingToggle<L, S, G> | null
	motions: ReadonlyMap<K, GridRowMotion>
}

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

/** Whether `flips` opens or closes nothing. @internal */
function noFlips<G>(flips: GridMotionFlips<G>) {
	return flips.opened.length + flips.closed.length === 0
}

/**
 * Tracks the open and close motion of the rows of a windowed body. A body
 * supplies only its toggle mapping in `source`, and it renders its rows from
 * `applied`, not from `live`.
 *
 * @remarks A toggle takes two commits before the paint. The render finds the
 * flips and reads no window. The first commit keeps the applied source, so
 * each row keeps its item, its key, and its node, and the window does not
 * move. A layout effect of that commit reads the window that the reader sees,
 * resolves the flips to the closing and the entering rows, and applies the
 * live source. React commits that update before the paint. A closing row thus
 * keeps its node from the toggle until its reveal lands, and an entering row
 * mounts once, closed.
 *
 * A change that flips nothing, such as a new filter, and a toggle under
 * reduced motion need no window. The render applies them, in one commit.
 * `applied` is `live` in every render but those of a pending toggle, so an
 * edit or a new order that keeps each row shows at once.
 *
 * The entering rows lose their motion after the commit that mounts them,
 * because a row that mounts later, as the reader scrolls, mounts open.
 * `release` drops a closing row once its reveal lands, and a fallback timer
 * drops each closing row that sends no `transitionend`. The hook reads
 * reduced motion live.
 *
 * @internal
 */
export function useGridWindowMotion<L, S, G, K>(
	live: L,
	source: GridMotionSource<L, S, G, K>,
	recordRef: RefObject<GridWindowRecord>,
	scrollRef: RefObject<HTMLElement | null>,
) {
	const reducedMotion = usePrefersReducedMotion()

	const [state, setState] = useState<MotionState<L, S, G, K>>(() => ({
		applied: live,
		captured: source.capture(live),
		pending: null,
		motions: new Map(),
	}))

	// Whether the rows hold the applied source: only while a toggle waits for its
	// window. Every other render reads `live`, so a change that keeps each row
	// (an edit, a new order inside a group) shows at once.
	let held = state.pending !== null

	// The flips count from the applied source, so a second change before the
	// window resolves the first one keeps both.
	if (!source.same(state.pending?.captured ?? state.captured, live)) {
		const flips = source.flips(state.captured, live)

		const captured = source.capture(live)

		if (reducedMotion || noFlips(flips)) {
			setState({
				applied: live,
				captured,
				pending: null,
				motions: applyChange(state.motions, source.resolve(flips, null)),
			})
		} else {
			setState({ ...state, pending: { live, captured, flips } })

			// React renders again at once with the toggle pending. This pass holds the
			// applied source too, so the body builds no list for `live` only to drop it.
			held = true
		}
	}

	const { pending } = state

	// The commit of a toggle still shows the applied source, so the window that
	// the record holds is the window that the reader sees.
	useLayoutEffect(() => {
		if (!pending) return

		const change = source.resolve(
			pending.flips,
			gridWindowView(recordRef.current, scrollRef.current),
		)

		setState((current) =>
			current.pending === pending
				? {
						applied: pending.live,
						captured: pending.captured,
						pending: null,
						motions: applyChange(current.motions, change),
					}
				: current,
		)
	}, [pending, source, recordRef, scrollRef])

	const { motions } = state

	const entering = hasPhase(motions, 'entering')

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
		if (!hasPhase(motions, 'closing')) return

		const timer = setTimeout(
			() =>
				setState((current) => ({ ...current, motions: withoutPhase(current.motions, 'closing') })),
			RELEASE_FALLBACK_MS,
		)

		return () => clearTimeout(timer)
	}, [motions])

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

	return { applied: held ? state.applied : live, motions, release }
}
