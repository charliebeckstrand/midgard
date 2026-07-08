import { describe, expect, it, vi } from 'vitest'
import { resolveAriaRowCount, resolveInfiniteScroll } from '../../modules/grid/grid-data-resolvers'
import { resolveLoadMore } from '../../modules/grid/use-grid-infinite-scroll'

describe('resolveLoadMore — overflowing (scroll-driven) regime', () => {
	// Base case: 50 loaded rows in an overflowing 600px window, the last rendered
	// row at index 45, threshold 5 — exactly at the loaded end's threshold zone
	// (45 >= 50 - 1 - 5 = 44) — with a scroll interaction since the last fire.
	const base = {
		lastRenderedIndex: 45,
		count: 50,
		hasMore: true,
		loadingMore: false,
		threshold: 5,
		requestedCount: -1,
		armed: true,
		overflowing: true,
		clientHeight: 600,
		capBounded: true,
		fillBase: null,
	}

	it('fires when armed and the last rendered row reaches the threshold zone', () => {
		expect(resolveLoadMore(base)).toBe('fire')
	})

	it('holds off just outside the threshold zone, fires once inside it', () => {
		// 43 < 44 (count - 1 - threshold): still a batch away from the end.
		expect(resolveLoadMore({ ...base, lastRenderedIndex: 43 })).toBe('hold')

		// 44 is the first index within the zone.
		expect(resolveLoadMore({ ...base, lastRenderedIndex: 44 })).toBe('fire')
	})

	it('does not fire when no more rows remain', () => {
		expect(resolveLoadMore({ ...base, hasMore: false })).toBe('hold')
	})

	it('does not fire while a load is in flight', () => {
		expect(resolveLoadMore({ ...base, loadingMore: true })).toBe('hold')
	})

	it('does not fire before any row renders', () => {
		expect(resolveLoadMore({ ...base, lastRenderedIndex: -1 })).toBe('hold')
	})

	it('holds in the threshold zone without a scroll interaction since the last fire', () => {
		// The firing invariant: a post-fill fetch needs a user scroll to arm it — a
		// re-render landing near the end (a transient `hasMore` flap, a same-extent
		// re-render) can't fire on its own.
		expect(resolveLoadMore({ ...base, armed: false })).toBe('hold')
	})

	it('does not chain-fetch when an append lands still within the threshold', () => {
		// Threshold at/past the batch size: the batch landed (50 → 75) with the
		// window still in the new end's zone, but the fire consumed the arm — the
		// next fetch waits for the next scroll instead of chaining back-to-back.
		expect(
			resolveLoadMore({
				...base,
				count: 75,
				lastRenderedIndex: 72,
				threshold: 30,
				requestedCount: 50,
				armed: false,
			}),
		).toBe('hold')
	})

	it('fires again for the grown extent once the user scrolls', () => {
		expect(resolveLoadMore({ ...base, count: 75, lastRenderedIndex: 72, requestedCount: 50 })).toBe(
			'fire',
		)
	})

	it('retries a failed fetch on the next scroll instead of dead-locking the latch', () => {
		// A request fired at count 50 but the count never grew (the fetch failed);
		// a fresh scroll interaction re-arms rather than waiting on growth forever.
		expect(resolveLoadMore({ ...base, requestedCount: 50 })).toBe('fire')
	})
})

describe('resolveLoadMore — viewport-fill regime', () => {
	// 10 loaded rows that don't yet overflow the 600px viewport: every row
	// renders, the loaded end is within any threshold, and no scroll can happen.
	// The cap didn't resolve to a fixed length, so the growth check applies.
	const fill = {
		lastRenderedIndex: 9,
		count: 10,
		hasMore: true,
		loadingMore: false,
		threshold: 10,
		requestedCount: -1,
		armed: false,
		overflowing: false,
		clientHeight: 600,
		capBounded: false,
		fillBase: null,
	}

	it('fires without a scroll while the rows do not fill the viewport', () => {
		expect(resolveLoadMore(fill)).toBe('fire')
	})

	it('fills once per loaded extent (the latch), re-arming as the count grows', () => {
		// Already requested at count 10: wait for the batch to land.
		expect(resolveLoadMore({ ...fill, requestedCount: 10 })).toBe('hold')

		// The batch landed (10 → 20), still under-filled: fill again.
		expect(resolveLoadMore({ ...fill, count: 20, lastRenderedIndex: 19, requestedCount: 10 })).toBe(
			'fire',
		)
	})

	it('keeps filling while the viewport height holds still', () => {
		// The fill began at 600px and the viewport is still 600px (give or take
		// rounding): a bounded container, keep filling until it overflows.
		expect(resolveLoadMore({ ...fill, fillBase: 600, clientHeight: 604 })).toBe('fire')
	})

	it('holds a zero-height viewport rather than fetching blind', () => {
		// A hidden or not-yet-laid-out grid is no evidence either way: no fetch, no
		// verdict — the fill resumes when a real measurement arrives.
		expect(resolveLoadMore({ ...fill, clientHeight: 0 })).toBe('hold')
	})

	it('declares a viewport that grew with the appended batches unbounded', () => {
		// The fill began at 600px but the "viewport" now stands at 1200px without
		// overflowing: the container is sizing to its content — the failure that
		// once chain-fetched an entire backend — so the fill stops.
		expect(resolveLoadMore({ ...fill, count: 20, fillBase: 600, clientHeight: 1200 })).toBe(
			'unbounded',
		)
	})

	it('trusts a fixed-length cap, filling while the viewport grows toward it', () => {
		// The container's max-height resolved to a fixed length: it is bounded by
		// construction, so the viewport legitimately grows with the content until
		// the cap truncates it — small batches keep filling instead of tripping
		// the growth check.
		expect(
			resolveLoadMore({ ...fill, count: 20, fillBase: 72, clientHeight: 144, capBounded: true }),
		).toBe('fire')
	})
})

describe('resolveInfiniteScroll', () => {
	it('returns null when no binding is supplied', () => {
		expect(resolveInfiniteScroll(undefined, 10, 50)).toBeNull()
	})

	it('defaults hasMore on; loadingMore, the indicator, and stable widths off; threshold to the overscan', () => {
		const onLoadMore = vi.fn()

		const resolved = resolveInfiniteScroll({ onLoadMore }, 12, 50)

		expect(resolved).toEqual({
			onLoadMore,
			hasMore: true,
			loadingMore: false,
			threshold: 12,
			totalRows: null,
			showLoadingIndicator: false,
			loadingIndicator: undefined,
			endMessage: undefined,
			error: undefined,
			stableColumnWidths: false,
		})
	})

	it('carries explicit gates, messages, and flags through, overriding the defaults', () => {
		const onLoadMore = vi.fn()

		const resolved = resolveInfiniteScroll(
			{
				onLoadMore,
				hasMore: false,
				loadingMore: true,
				threshold: 3,
				showLoadingIndicator: true,
				loadingIndicator: 'more',
				endMessage: 'No more results',
				error: 'Failed to load',
				stableColumnWidths: true,
			},
			10,
			50,
		)

		expect(resolved).toEqual({
			onLoadMore,
			hasMore: false,
			loadingMore: true,
			threshold: 3,
			totalRows: null,
			showLoadingIndicator: true,
			loadingIndicator: 'more',
			endMessage: 'No more results',
			error: 'Failed to load',
			stableColumnWidths: true,
		})
	})

	it('derives hasMore from totalRows against the loaded count', () => {
		const onLoadMore = vi.fn()

		// 50 of 200 loaded: more remain.
		expect(resolveInfiniteScroll({ onLoadMore, totalRows: 200 }, 10, 50)?.hasMore).toBe(true)

		// The whole set is loaded: done.
		expect(resolveInfiniteScroll({ onLoadMore, totalRows: 200 }, 10, 200)?.hasMore).toBe(false)
	})

	it('lets an explicit hasMore override the totalRows derivation', () => {
		const onLoadMore = vi.fn()

		expect(
			resolveInfiniteScroll({ onLoadMore, totalRows: 200, hasMore: false }, 10, 50)?.hasMore,
		).toBe(false)
	})
})

describe('resolveAriaRowCount — under infinite scroll', () => {
	it('reports the loaded count + 1 when no more rows remain to load', () => {
		// Unpaginated: rendered 50 + the header row.
		expect(resolveAriaRowCount(null, 50, 0, { hasMore: false, totalRows: null })).toBe(51)
	})

	it('reports ARIA -1 while more rows may load and no total is stated', () => {
		expect(resolveAriaRowCount(null, 50, 0, { hasMore: true, totalRows: null })).toBe(-1)
	})

	it('reports the stated totalRows + 1 while more rows remain to load', () => {
		// The binding's server total makes the count determinate despite the
		// partially-loaded window.
		expect(resolveAriaRowCount(null, 50, 0, { hasMore: true, totalRows: 30000 })).toBe(30001)
	})

	it('carries the group-band header row into the count when determinate', () => {
		expect(resolveAriaRowCount(null, 50, 1, { hasMore: false, totalRows: null })).toBe(52)

		expect(resolveAriaRowCount(null, 50, 1, { hasMore: true, totalRows: 30000 })).toBe(30002)
	})
})
