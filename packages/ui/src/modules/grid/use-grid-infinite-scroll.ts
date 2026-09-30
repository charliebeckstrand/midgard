'use client'

import { type RefObject, useEffect, useEffectEvent, useRef } from 'react'

/**
 * Pixels the scroll viewport can grow between viewport-fill fetches before the
 * fill is declared unbounded. A bounded container's `clientHeight` holds still
 * while rows append (give or take scrollbar/zoom rounding). A container sizing
 * to its content grows by at least a row per batch, far past this.
 *
 * @internal
 */
const FILL_GROWTH_TOLERANCE = 8

/** What an infinite-scroll evaluation resolved to; see {@link resolveLoadMore}. @internal */
export type LoadMoreDecision =
	/** Call `onLoadMore` now. */
	| 'fire'
	/** Conditions not met — wait for a scroll, a grown count, or a gate to clear. */
	| 'hold'
	/**
	 * The scroll container shows no bounded height: zero, or grown alongside a
	 * viewport-fill append. Virtualize is therefore not windowing, and a fetch
	 * would chain without end. Stop fetching and fail loud in dev.
	 */
	| 'unbounded'

/**
 * Resolves whether the virtualized scroll can call `onLoadMore`, upholding the
 * infinite-scroll firing invariant. That invariant: *`onLoadMore` never fires
 * more than once per user scroll interaction, except for a bounded initial
 * viewport-fill.*
 * The pure seam {@link useGridInfiniteScroll} and its tests share — fed plain
 * indices and scroll-box measurements, returning the decision with no
 * virtualizer or effect.
 *
 * Two firing regimes, split on whether the scroll container overflows:
 *
 * - **Overflowing** (`scrollHeight > clientHeight` — real evidence of a bounded
 *   window): fire only when `armed`, i.e. a user scroll interaction happened
 *   since the last fire. Each fire consumes the arm. An append can leave the
 *   window near the new end, with a `threshold` at or past the batch size.
 *   Such an append waits for the next scroll, instead of chain-fetching. A
 *   scroll re-arms unconditionally, so a *failed* fetch (the count never grew)
 *   is retried on the next scroll rather than dead-locking the latch.
 * - **Viewport-fill** (not overflowing — the loaded rows don't fill the
 *   viewport yet): fire once per loaded extent (the `requestedCount` latch)
 *   with no scroll needed. A short first page then grows until the window
 *   overflows. Bounded by geometry: a capped viewport can only take
 *   `maxHeight / rowHeight` rows before overflowing. When the container's cap
 *   resolved to a fixed length (`capBounded`) that termination is guaranteed
 *   — its `clientHeight` can legitimately grow *toward* the cap while
 *   under-filled. Without a resolved cap, a `clientHeight` that grew past
 *   `fillBase` as batches appended is a container sizing to its content. Here
 *   `fillBase` is the viewport measured when the fill began. That is the
 *   unbounded-window failure that once chain-fetched a 30K-row backend, so the
 *   fill stops with the `'unbounded'` verdict instead. A zero-height viewport
 *   holds (a hidden or not-yet-laid-out grid isn't evidence either way).
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

	// A fixed-length cap bounds the container by construction — its viewport can
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
	/**
	 * The `scrollTop` of the container where layout last left it: at the last
	 * scroll event, or after the last layout that changed a size. `null` before
	 * the listener attaches.
	 */
	restTop: number | null
	/** A layout scroll event set the arm, and no scroll event has evaluated it yet. */
	unchecked: boolean
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
		restTop: null,
		unchecked: false,
	}
}

/**
 * Handles a row-set replacement: the loaded set shrank (a sort/filter/search
 * swapped the rows rather than appending). The old scroll position is therefore
 * meaningless against the new set. Scrolls back to the top and clears the
 * latch, arm, and fill state, requiring fresh overflow-plus-scroll evidence
 * before the next fetch. Otherwise a position deep in the old set would sit
 * past the new end and re-trigger an immediate fetch cascade. The caller still
 * evaluates in the same run: the cleared arm holds a new set that overflows,
 * and a new set that does not fill the viewport fetches through the fill.
 *
 * @internal
 */
function resetOnReplacement(
	state: LoadMoreState,
	element: HTMLElement | null,
	count: number,
): void {
	if (count >= state.prevCount) {
		state.prevCount = count

		return
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
	onLoadMore: () => void
}): void {
	const { state, element, count } = args

	resetOnReplacement(state, element, count)

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

	args.onLoadMore()
}

/**
 * Arms the next fire on a scroll event of the container, and tells whether the
 * event must run an evaluation of its own.
 *
 * The evaluation runs on the arm edge: the first scroll since the last fire. A
 * short scroll arms, but the last rendered index can stay inside the overscan,
 * so no render evaluates the arm. A failed fetch would then wait for a long
 * scroll.
 *
 * A scroll event that finds the offset where layout left it arms, but does not
 * evaluate. Layout moved the offset: the native scroll anchor held a row in
 * view while a row above it grew, or the scroll end clamped the offset after
 * the content shrank. The event is layout, not the user. An evaluation on such
 * an event would fire again after each fire, with no user scroll between the
 * two. A scroll by the user, or a scroll that the grid requests, moves the
 * offset away from where layout left it, so the event evaluates.
 *
 * The rest offset comes from the offset itself, never from `scrollHeight`. A
 * measured row changes `scrollHeight` with no scroll event, so a height that
 * the last event recorded goes stale. A short scroll after such a measurement
 * then read as layout, and the retry after a failed fetch never ran.
 *
 * @param state - The bookkeeping of the hook.
 * @param scrollTop - The `scrollTop` of the container at this event.
 * @returns `true` when the event must run one evaluation.
 *
 * @internal
 */
function armOnScroll(state: LoadMoreState, scrollTop: number): boolean {
	const moved = state.restTop !== scrollTop

	state.restTop = scrollTop

	// The programmatic scroll to the top of a replacement is not the user.
	if (state.suppressArm) {
		state.suppressArm = false

		return false
	}

	// An arm that a layout event set waits for the next event that moves the offset.
	if (state.armed && !state.unchecked) return false

	state.armed = true

	state.unchecked = !moved

	return moved
}

/** Parameters for {@link useGridInfiniteScroll}. @internal */
type GridInfiniteScrollParams = {
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
 * resolves. That means at most one fire per user scroll interaction. A scroll
 * event on the container arms the next fire, and firing consumes the arm. The
 * arm edge runs one evaluation in the next frame, so a short scroll after a
 * failed fetch retries when the window does not move (see `armOnScroll`). A
 * geometry-bounded viewport-fill also fires while the loaded rows don't yet
 * overflow the container. When the container turns out unbounded — its height
 * grows with the content instead of windowing it — fetching stops and a
 * dev-only error names the failure. Replacing the row set with a shorter one
 * scrolls back to the top and resets the latch and arm. Such a swap comes from
 * a sort, filter, or search under `keepPreviousData`. A scroll position deep in
 * the old set then can't cascade fetches against the new one.
 * Inert when `infiniteScroll` is `null`. Reads `onLoadMore` as an effect event,
 * so an inline consumer callback does not arm the effect again.
 *
 * @internal
 */
export function useGridInfiniteScroll({
	lastRenderedIndex,
	count,
	infiniteScroll,
	scrollRef,
}: GridInfiniteScrollParams): void {
	const onLoadMore = useEffectEvent(() => infiniteScroll?.onLoadMore())

	// The cross-run bookkeeping (latch, arm, fill base, replacement counter); one
	// object so the evaluation helpers above mutate a single seam.
	const stateRef = useRef<LoadMoreState | null>(null)

	if (stateRef.current == null) stateRef.current = initialLoadMoreState(count)

	const active = infiniteScroll != null

	const hasMore = infiniteScroll?.hasMore ?? false

	const loadingMore = infiniteScroll?.loadingMore ?? false

	const threshold = infiniteScroll?.threshold ?? 0

	// One evaluation against the newest props, for the arm edge of a scroll (see
	// `armOnScroll`).
	const evaluateOnArm = useEffectEvent((state: LoadMoreState) => {
		evaluateLoadMore({
			state,
			element: scrollRef.current,
			lastRenderedIndex,
			count,
			hasMore,
			loadingMore,
			threshold,
			onLoadMore,
		})
	})

	// Arm on the container's scroll events — the user-interaction evidence each
	// post-fill fire requires. Passive: the listener flips state, and on the arm
	// edge it runs one evaluation.
	useEffect(() => {
		const element = scrollRef.current

		if (!active || !element) return

		// The evaluation waits one frame, for the render of the scroll. The index
		// of that render tells whether the window still nears the end.
		let frame = 0

		// A resize observation runs after layout, and so after each offset that
		// layout moved: an anchor correction, or a clamp at the scroll end. It
		// records that offset as the rest offset of `armOnScroll`. It reads the
		// offset of a layout that is already done, so it forces no layout.
		const rest = () => {
			if (stateRef.current) stateRef.current.restTop = element.scrollTop
		}

		rest()

		const observer = new ResizeObserver(rest)

		observer.observe(element)

		for (const child of element.children) observer.observe(child)

		const onScroll = () => {
			const state = stateRef.current

			if (!state || !armOnScroll(state, element.scrollTop) || frame) return

			frame = requestAnimationFrame(() => {
				frame = 0

				// A render can fire in the frame and use the arm up. A layout event
				// that arms again before this callback does not count as the scroll
				// of the user, so it runs no evaluation here.
				if (!state.unchecked) evaluateOnArm(state)
			})
		}

		element.addEventListener('scroll', onScroll, { passive: true })

		return () => {
			element.removeEventListener('scroll', onScroll)

			observer.disconnect()

			cancelAnimationFrame(frame)
		}
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
			onLoadMore,
		})
	}, [active, lastRenderedIndex, count, hasMore, loadingMore, threshold, scrollRef])
}
