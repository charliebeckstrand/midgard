import type { GridInfiniteScroll, GridVirtualize } from '../../grid-data-types'
import type { GridPagination } from '../../types'

/**
 * Validates the mutually-dependent grid props up front, throwing a pointed error
 * for a combination the grid can't render: virtualization (or the infinite
 * scroll that implies it) without a sized scroll container, infinite scroll
 * against an explicitly refused window, or alongside the paged footer it
 * replaces. Kept off {@link GridData}'s cognitive-complexity budget. @internal
 */
export function assertGridProps(args: {
	virtualize: GridVirtualize | undefined
	maxHeight: string | undefined
	infiniteScroll: GridInfiniteScroll | undefined
	pagination: GridPagination | undefined
}): void {
	if ((args.virtualize || args.infiniteScroll) && !args.maxHeight) {
		throw new Error(
			'<Grid virtualize / infiniteScroll> requires `maxHeight` — the windowed rows need a scroll container of known size: a fixed CSS length, or `"fill"` inside a CSS-sized parent.',
		)
	}

	if (args.infiniteScroll && args.virtualize === false) {
		throw new Error(
			'<Grid infiniteScroll> windows the loaded rows through the virtualized scroll container — it implies `virtualize`, which must not be explicitly `false`.',
		)
	}

	if (args.infiniteScroll && args.pagination) {
		throw new Error(
			'<Grid> takes either `pagination` or `infiniteScroll`, not both — infinite scroll replaces the paged footer.',
		)
	}
}

/**
 * The `virtualize` setting with the `infiniteScroll` implication applied:
 * infinite scroll layers on the virtualized window, so setting it implies
 * `virtualize` rather than requiring three coupled props. An explicit
 * `virtualize` (object or `true`) still tunes the window; the contradictory
 * `virtualize={false}` + `infiniteScroll` throws in {@link assertGridProps}.
 * Kept off {@link GridData}'s complexity budget. @internal
 */
export function implyVirtualize(
	virtualize: GridVirtualize | undefined,
	infiniteScroll: GridInfiniteScroll | undefined,
): GridVirtualize | undefined {
	return virtualize ?? (infiniteScroll ? true : undefined)
}
