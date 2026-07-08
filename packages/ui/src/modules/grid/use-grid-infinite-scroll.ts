'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * Pixels the scroll viewport may grow between viewport-fill fetches before the
 * fill is declared unbounded. A bounded container's `clientHeight` holds still
 * while rows append (give or take scrollbar/zoom rounding); a container sizing
 * to its content grows by at least a row per batch, far past this. @internal
 */
const FILL_GROWTH_TOLERANCE = 8

/** What an infinite-scroll evaluation resolved to; see {@link resolveLoadMore}. @internal */
export type LoadMoreDecision =
	/** Call `onLoadMore` now. */
	| 'fire'
	/** Conditions not met — wait for a scroll, a grown count, or a gate to clear. */
	| 'hold'
	/**
	 * The scroll container shows no bounded height — zero, or grown alongside a
	 * viewport-fill append — so virtualize is not windowing and a fetch would
	 * chain without end. Stop fetching and fail loud in dev.
	 */
	| 'unbounded'

/**
 * Resolves whether the virtualized scroll may call `onLoadMore`, upholding the
 * infinite-scroll firing invariant: *`onLoadMore` never fires more than once
 * per user scroll interaction, except for a bounded initial viewport-fill.*
 * The pure seam {@link useGridInfiniteScroll} and its tests share — fed plain
 * indices and scroll-box measurements, returning the decision with no
 * virtualizer or effect.
 *
 * Two firing regimes, split on whether the scroll container overflows:
 *
 * - **Overflowing** (`scrollHeight > clientHeight` — real evidence of a bounded
 *   window): fire only when `armed`, i.e. a user scroll interaction happened
 *   since the last fire. Each fire consumes the arm, so an append that leaves
 *   the window near the new end (a `threshold` at or past the batch size)
 *   waits for the next scroll instead of chain-fetching; and since a scroll
 *   re-arms unconditionally, a *failed* fetch (the count never grew) is
 *   retried on the next scroll rather than dead-locking the latch.
 * - **Viewport-fill** (not overflowing — the loaded rows don't fill the
 *   viewport yet): fire once per loaded extent (the `requestedCount` latch)
 *   with no scroll needed, so a short first page grows until the window
 *   overflows. Bounded by geometry: a capped viewport can only take
 *   `maxHeight / rowHeight` rows before overflowing. When the container's cap
 *   resolved to a fixed length (`capBounded`) that termination is guaranteed
 *   — its `clientHeight` may legitimately grow *toward* the cap while
 *   under-filled. Without a resolved cap, a `clientHeight` that grew past
 *   `fillBase` (the viewport measured when the fill began) as batches
 *   appended is a container sizing to its content — the unbounded-window
 *   failure that once chain-fetched a 30K-row backend — so the fill stops
 *   with the `'unbounded'` verdict instead. A zero-height viewport holds (a
 *   hidden or not-yet-laid-out grid isn't evidence either way).
 *
 * @param args.lastRenderedIndex - Index of the last row in the window, or `-1` when none render.
 * @param args.count - Rows currently loaded (the virtualized count).
 * @param args.hasMore - Whether more rows remain beyond the loaded set.
 * @param args.loadingMore - Whether a load is in flight.
 * @param args.threshold - Rows from the end that trip the load.
 * @param args.requestedCount - The loaded count a request last fired at (the viewport-fill latch).
 * @param args.armed - A user scroll interaction happened since the last fire.
 * @param args.overflowing - The scroll container overflows (`scrollHeight > clientHeight`).
 * @param args.clientHeight - The scroll viewport's height (px); `0` when collapsed or unmeasured.
 * @param args.capBounded - The container's computed `max-height` resolved to a fixed length, so it is bounded by construction.
 * @param args.fillBase - `clientHeight` recorded when the current fill sequence began, or `null` before any fill.
 * @returns The {@link LoadMoreDecision}.
 *
 * @internal
 */
export function resolveLoadMore(args: {
	lastRenderedIndex: number
	count: number
	hasMore: boolean
	loadingMore: boolean
	threshold: number
	requestedCount: number
	armed: boolean
	overflowing: boolean
	clientHeight: number
	capBounded: boolean
	fillBase: number | null
}): LoadMoreDecision {
	const { lastRenderedIndex, count, hasMore, loadingMore, threshold, requestedCount } = args

	// Nothing more to fetch, one already in flight, or no rows rendered yet.
	if (!hasMore || loadingMore || lastRenderedIndex < 0) return 'hold'

	// The last rendered row is still more than `threshold` from the loaded end.
	if (lastRenderedIndex < count - 1 - threshold) return 'hold'

	// A bounded, overflowing window fires on scroll evidence alone: once per
	// user scroll interaction, which also retries a fetch that failed to grow
	// the count (the fill latch below never blocks this path).
	if (args.overflowing) return args.armed ? 'fire' : 'hold'

	// Viewport-fill: a zero-height viewport is a hidden or not-yet-laid-out grid
	// — no evidence either way, so hold until a real measurement arrives.
	if (args.clientHeight <= 0) return 'hold'

	// A fixed-length cap bounds the container by construction — its viewport may
	// legitimately grow toward the cap while under-filled, and the fill is
	// guaranteed to terminate at it. Without one, a viewport that grew alongside
	// the appended batches is sizing to its content: virtualize is not windowing,
	// so fetching must stop.
	if (
		!args.capBounded &&
		args.fillBase != null &&
		args.clientHeight > args.fillBase + FILL_GROWTH_TOLERANCE
	) {
		return 'unbounded'
	}

	// Already requested at this loaded extent: wait for the count to grow (which
	// re-arms the latch) before filling again, so a re-render at the same length —
	// or a synchronous local append still settling — doesn't double-request.
	if (requestedCount === count) return 'hold'

	return 'fire'
}

/**
 * Cross-run infinite-scroll bookkeeping, held in one ref by
 * {@link useGridInfiniteScroll} and mutated by the evaluation helpers below.
 *
 * @internal
 */
type LoadMoreState = {
	/** The loaded count a request last fired at — the viewport-fill latch. */
	requestedCount: number
	/** A user scroll interaction happened since the last fire. */
	armed: boolean
	/** Viewport height when the current fill sequence began, or `null` outside one. */
	fillBase: number | null
	/** Swallow the next scroll event (a programmatic scroll-to-top, not the user). */
	suppressArm: boolean
	/** Loaded count of the previous run, for replacement (shrink) detection. */
	prevCount: number
	/** The unbounded-container dev error already fired this mount. */
	warned: boolean
}

/** Returns the resting {@link LoadMoreState} seeded at `count` loaded rows. @internal */
function initialLoadMoreState(count: number): LoadMoreState {
	return {
		requestedCount: -1,
		armed: false,
		fillBase: null,
		suppressArm: false,
		prevCount: count,
		warned: false,
	}
}

/**
 * Handles a row-set replacement: the loaded set shrank (a sort/filter/search
 * swapped the rows rather than appending), so the old scroll position is
 * meaningless against the new set. Scrolls back to the top and clears the
 * latch, arm, and fill state, requiring fresh overflow-plus-scroll evidence
 * before the next fetch — otherwise a position deep in the old set would sit
 * past the new end and re-trigger an immediate fetch cascade. Returns whether
 * a replacement was handled (the caller then skips this run's evaluation).
 *
 * @internal
 */
function resetOnReplacement(
	state: LoadMoreState,
	element: HTMLElement | null,
	count: number,
): boolean {
	if (count >= state.prevCount) {
		state.prevCount = count

		return false
	}

	state.prevCount = count

	state.requestedCount = -1

	state.armed = false

	state.fillBase = null

	if (element && element.scrollTop > 0) {
		// The programmatic scroll fires a scroll event; swallow it so the reset
		// doesn't read as a user interaction and arm the next fetch itself.
		state.suppressArm = true

		element.scrollTop = 0
	}

	return true
}

/** Fails loud in dev — once per mount — when the scroll container isn't windowing. @internal */
function warnUnbounded(state: LoadMoreState): void {
	if (process.env.NODE_ENV === 'production' || state.warned) return

	state.warned = true

	console.error(
		'<Grid infiniteScroll>: virtualize is not windowing — the scroll container has no bounded height, so every loaded row renders and `onLoadMore` would fetch without end. Give the grid a fixed `maxHeight` (a percentage cannot bind), or `maxHeight="fill"` inside a CSS-sized parent.',
	)
}

/**
 * One infinite-scroll evaluation: replacement reset, scroll-box measurement,
 * the {@link resolveLoadMore} decision, and the fire (or the dev unbounded
 * error). Module-level so the effect in {@link useGridInfiniteScroll} stays a
 * thin call within its complexity budget.
 *
 * @internal
 */
function evaluateLoadMore(args: {
	state: LoadMoreState
	element: HTMLElement | null
	lastRenderedIndex: number
	count: number
	hasMore: boolean
	loadingMore: boolean
	threshold: number
	onLoadMore: (() => void) | null
}): void {
	const { state, element, count } = args

	if (resetOnReplacement(state, element, count)) return

	const clientHeight = element?.clientHeight ?? 0

	const overflowing = element != null && element.scrollHeight > element.clientHeight

	// Overflow is the fill's goal; reaching it ends the sequence, so a later
	// under-filled state (a replacement's short new set) starts a fresh one.
	if (overflowing) state.fillBase = null

	// A `max-height` that computed to a fixed length bounds the container by
	// construction (a percentage that failed to bind computes to the raw
	// percentage; `fill` mode sets none). Only the fill path reads it, so an
	// overflowing window skips the style read.
	const capBounded =
		!overflowing && element != null && getComputedStyle(element).maxHeight.endsWith('px')

	const decision = resolveLoadMore({
		lastRenderedIndex: args.lastRenderedIndex,
		count,
		hasMore: args.hasMore,
		loadingMore: args.loadingMore,
		threshold: args.threshold,
		requestedCount: state.requestedCount,
		armed: state.armed,
		overflowing,
		clientHeight,
		capBounded,
		fillBase: state.fillBase,
	})

	if (decision === 'unbounded') {
		warnUnbounded(state)

		return
	}

	if (decision !== 'fire') return

	// The first fill of a sequence records the viewport it is filling, so a
	// viewport that grows with the appended batches is caught (see above).
	if (!overflowing && state.fillBase == null) state.fillBase = clientHeight

	state.requestedCount = count

	state.armed = false

	args.onLoadMore?.()
}

/** Parameters for {@link useGridInfiniteScroll}. @internal */
type UseGridInfiniteScrollParams = {
	/** Index of the last row currently in the virtual window, or `-1` when none. */
	lastRenderedIndex: number
	/** Rows currently loaded (the virtualized count). */
	count: number
	/** Resolved infinite-scroll gates, or `null` when the grid isn't infinite-scrolling. */
	infiniteScroll: {
		onLoadMore: () => void
		hasMore: boolean
		loadingMore: boolean
		threshold: number
	} | null
	/** The virtualized scroll container: measured for bounded-window evidence, armed by its scroll events. */
	scrollRef: RefObject<HTMLDivElement | null>
}

/**
 * Fires the infinite-scroll `onLoadMore` when the virtualized window nears the
 * end of the loaded rows, upholding the firing invariant {@link resolveLoadMore}
 * resolves: at most one fire per user scroll interaction (a scroll event on the
 * container arms the next fire; firing consumes the arm), plus a geometry-bounded
 * viewport-fill while the loaded rows don't yet overflow the container. When the
 * container turns out unbounded — its height grows with the content instead of
 * windowing it — fetching stops and a dev-only error names the failure. Replacing
 * the row set with a shorter one (a sort/filter/search swap under
 * `keepPreviousData`) scrolls back to the top and resets the latch and arm, so a
 * scroll position deep in the old set can't cascade fetches against the new one.
 * Inert when `infiniteScroll` is `null`. Reads `onLoadMore` through a ref so an
 * inline consumer callback doesn't re-arm the effect.
 *
 * @internal
 */
export function useGridInfiniteScroll({
	lastRenderedIndex,
	count,
	infiniteScroll,
	scrollRef,
}: UseGridInfiniteScrollParams): void {
	const onLoadMoreRef = useRef<(() => void) | null>(null)

	onLoadMoreRef.current = infiniteScroll?.onLoadMore ?? null

	// The cross-run bookkeeping (latch, arm, fill base, replacement counter); one
	// object so the evaluation helpers above mutate a single seam.
	const stateRef = useRef<LoadMoreState | null>(null)

	stateRef.current ??= initialLoadMoreState(count)

	const active = infiniteScroll != null

	const hasMore = infiniteScroll?.hasMore ?? false

	const loadingMore = infiniteScroll?.loadingMore ?? false

	const threshold = infiniteScroll?.threshold ?? 0

	// Arm on the container's scroll events — the user-interaction evidence each
	// post-fill fire requires. Passive: the listener only flips state.
	useEffect(() => {
		const element = scrollRef.current

		if (!active || !element) return

		const onScroll = () => {
			const state = stateRef.current

			if (!state) return

			if (state.suppressArm) {
				state.suppressArm = false

				return
			}

			state.armed = true
		}

		element.addEventListener('scroll', onScroll, { passive: true })

		return () => element.removeEventListener('scroll', onScroll)
	}, [active, scrollRef])

	useEffect(() => {
		const state = stateRef.current

		if (!state) return

		if (!active) {
			// Preserve `warned` so toggling the binding can't re-fire the dev error.
			Object.assign(state, { ...initialLoadMoreState(count), warned: state.warned })

			return
		}

		evaluateLoadMore({
			state,
			element: scrollRef.current,
			lastRenderedIndex,
			count,
			hasMore,
			loadingMore,
			threshold,
			onLoadMore: onLoadMoreRef.current,
		})
	}, [active, lastRenderedIndex, count, hasMore, loadingMore, threshold, scrollRef])
}
