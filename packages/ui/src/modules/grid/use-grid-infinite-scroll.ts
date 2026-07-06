'use client'

import { useEffect, useRef } from 'react'

/**
 * Whether the virtualized scroll has reached the load-more zone: the last
 * rendered row sits within `threshold` of the loaded end, more rows remain, none
 * is in flight, and this loaded extent hasn't already been requested. The pure
 * seam {@link useGridInfiniteScroll} and its tests share — fed plain indices,
 * returning the fire/hold decision with no virtualizer or effect.
 *
 * @param args.lastRenderedIndex - Index of the last row in the window, or `-1` when none render.
 * @param args.count - Rows currently loaded (the virtualized count).
 * @param args.hasMore - Whether more rows remain beyond the loaded set.
 * @param args.loadingMore - Whether a load is in flight.
 * @param args.threshold - Rows from the end that trip the load.
 * @param args.requestedCount - The loaded count a request last fired at (the re-fire latch).
 * @returns `true` to call `onLoadMore` now.
 *
 * @internal
 */
export function shouldLoadMore(args: {
	lastRenderedIndex: number
	count: number
	hasMore: boolean
	loadingMore: boolean
	threshold: number
	requestedCount: number
}): boolean {
	const { lastRenderedIndex, count, hasMore, loadingMore, threshold, requestedCount } = args

	// Nothing more to fetch, one already in flight, or no rows rendered yet.
	if (!hasMore || loadingMore || lastRenderedIndex < 0) return false

	// Already requested at this loaded extent: wait for the count to grow (which
	// re-arms the latch) before firing again, so a re-render at the same length —
	// or a synchronous local append still settling — doesn't double-request.
	if (requestedCount === count) return false

	// The last rendered row is within `threshold` of the loaded end.
	return lastRenderedIndex >= count - 1 - threshold
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
}

/**
 * Fires the infinite-scroll `onLoadMore` when the virtualized window nears the
 * end of the loaded rows (see {@link shouldLoadMore}), latched to fire once per
 * loaded extent so a re-render — or a synchronous local append still settling —
 * doesn't re-request. Inert when `infiniteScroll` is `null`. Reads `onLoadMore`
 * through a ref so an inline consumer callback doesn't re-arm the effect.
 *
 * @internal
 */
export function useGridInfiniteScroll({
	lastRenderedIndex,
	count,
	infiniteScroll,
}: UseGridInfiniteScrollParams): void {
	const onLoadMoreRef = useRef<(() => void) | null>(null)

	onLoadMoreRef.current = infiniteScroll?.onLoadMore ?? null

	// The loaded count a request last fired at, so a fire waits for the count to
	// grow before arming again (see `shouldLoadMore`); reset when detection is off.
	const requestedCountRef = useRef(-1)

	const active = infiniteScroll != null

	const hasMore = infiniteScroll?.hasMore ?? false

	const loadingMore = infiniteScroll?.loadingMore ?? false

	const threshold = infiniteScroll?.threshold ?? 0

	useEffect(() => {
		if (!active) {
			requestedCountRef.current = -1

			return
		}

		const fire = shouldLoadMore({
			lastRenderedIndex,
			count,
			hasMore,
			loadingMore,
			threshold,
			requestedCount: requestedCountRef.current,
		})

		if (!fire) return

		requestedCountRef.current = count

		onLoadMoreRef.current?.()
	}, [active, lastRenderedIndex, count, hasMore, loadingMore, threshold])
}
