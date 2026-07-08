import { describe, expect, it, vi } from 'vitest'
import { resolveAriaRowCount, resolveInfiniteScroll } from '../../modules/grid/grid-data-resolvers'
import { shouldLoadMore } from '../../modules/grid/use-grid-infinite-scroll'

describe('shouldLoadMore', () => {
	// Base case: 50 loaded rows, the last rendered row at index 45, threshold 5 —
	// exactly at the loaded end's threshold zone (45 >= 50 - 1 - 5 = 44).
	const base = {
		lastRenderedIndex: 45,
		count: 50,
		hasMore: true,
		loadingMore: false,
		threshold: 5,
		requestedCount: -1,
	}

	it('fires when the last rendered row reaches the threshold zone', () => {
		expect(shouldLoadMore(base)).toBe(true)
	})

	it('holds off just outside the threshold zone, fires once inside it', () => {
		// 43 < 44 (count - 1 - threshold): still a batch away from the end.
		expect(shouldLoadMore({ ...base, lastRenderedIndex: 43 })).toBe(false)

		// 44 is the first index within the zone.
		expect(shouldLoadMore({ ...base, lastRenderedIndex: 44 })).toBe(true)
	})

	it('does not fire when no more rows remain', () => {
		expect(shouldLoadMore({ ...base, hasMore: false })).toBe(false)
	})

	it('does not fire while a load is in flight', () => {
		expect(shouldLoadMore({ ...base, loadingMore: true })).toBe(false)
	})

	it('does not fire before any row renders', () => {
		expect(shouldLoadMore({ ...base, lastRenderedIndex: -1 })).toBe(false)
	})

	it('does not re-fire at a loaded extent it already requested at', () => {
		// A request already fired at count 50; wait for the count to grow.
		expect(shouldLoadMore({ ...base, requestedCount: 50 })).toBe(false)
	})

	it('re-arms once the loaded count grows past the last request', () => {
		// The batch landed (count 50 → 75); the last rendered row is near the new end.
		expect(shouldLoadMore({ ...base, count: 75, lastRenderedIndex: 72, requestedCount: 50 })).toBe(
			true,
		)
	})

	it('fires immediately for a set smaller than the threshold (fills the viewport)', () => {
		// 3 rows, threshold 10: the loaded end is always within reach once a row renders.
		expect(
			shouldLoadMore({
				...base,
				count: 3,
				lastRenderedIndex: 2,
				threshold: 10,
				requestedCount: -1,
			}),
		).toBe(true)
	})
})

describe('resolveInfiniteScroll', () => {
	it('returns null when no binding is supplied', () => {
		expect(resolveInfiniteScroll(undefined, 10)).toBeNull()
	})

	it('defaults hasMore on; loadingMore, the indicator, and stable widths off; threshold to the overscan', () => {
		const onLoadMore = vi.fn()

		const resolved = resolveInfiniteScroll({ onLoadMore }, 12)

		expect(resolved).toEqual({
			onLoadMore,
			hasMore: true,
			loadingMore: false,
			threshold: 12,
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
		)

		expect(resolved).toEqual({
			onLoadMore,
			hasMore: false,
			loadingMore: true,
			threshold: 3,
			showLoadingIndicator: true,
			loadingIndicator: 'more',
			endMessage: 'No more results',
			error: 'Failed to load',
			stableColumnWidths: true,
		})
	})
})

describe('resolveAriaRowCount — indeterminate under infinite scroll', () => {
	it('reports the loaded count + 1 when no more rows remain to load', () => {
		// Unpaginated: rendered 50 + the header row.
		expect(resolveAriaRowCount(null, 50, 0, false)).toBe(51)
	})

	it('reports ARIA -1 while more rows may load, whatever the loaded count', () => {
		expect(resolveAriaRowCount(null, 50, 0, true)).toBe(-1)
	})

	it('carries the group-band header row into the count when determinate', () => {
		expect(resolveAriaRowCount(null, 50, 1, false)).toBe(52)
	})
})
