'use client'

import type { ReactElement } from 'react'
import { TableCell } from '../../components/table'
import { Text } from '../../components/text'
import { hasErrorSlot } from './engine/grid-data/guards'
import type { GridColumnPinning } from './engine/grid-table/pinning-view'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import { GridSkeletonCells } from './grid-skeleton-cells'
import type { GridColumn } from './types'

/** The state that the infinite-scroll trailer shows, or `null` for none. @internal */
type GridTrailerState = 'error' | 'loading' | 'end' | null

/**
 * The state of the infinite-scroll trailer, in precedence order: a failed load,
 * a batch in flight with the loading indicator on, then the reached end with an
 * end message. @internal
 */
function trailerState(infiniteScroll: ResolvedInfiniteScroll): GridTrailerState {
	const { error, loadingMore, showLoadingIndicator, hasMore, endMessage } = infiniteScroll

	if (hasErrorSlot(error)) return 'error'

	if (loadingMore && showLoadingIndicator) return 'loading'

	if (!hasMore && endMessage != null && endMessage !== false) return 'end'

	return null
}

/**
 * Whether the trailer is a row of the grid that the row count holds. A message
 * row (the error or the end) is a row when the loaded rows are the whole set,
 * so it is the last row before the grand total. While more rows remain, the
 * count is the server total or unknown, and the message row is not a member of
 * that set. The loading row is `aria-hidden` filler, so it is never a row.
 *
 * @internal
 */
export function trailerCounted(infiniteScroll: ResolvedInfiniteScroll | null): boolean {
	if (!infiniteScroll || infiniteScroll.hasMore) return false

	const state = trailerState(infiniteScroll)

	return state === 'error' || state === 'end'
}

/**
 * The single trailing row below the loaded rows for the infinite-scroll terminal
 * states, resolved in precedence order:
 *
 * - a failed load (`error`) shows a `Text tone="error"` message;
 * - an in-flight batch shows the opt-in loading indicator: the custom
 *   `loadingIndicator`, else a per-column skeleton run;
 * - the reached end (`hasMore` false) shows the muted `endMessage`.
 *
 * The skeleton run mirrors the initial loading skeleton. The trailer is `null`
 * for the common mid-scroll case, where none applies. The loading row stays
 * `aria-hidden` filler (the busy status announces the grown total), while the
 * message rows carry real text and stay in the tree. A message row that the
 * row count holds (see {@link trailerCounted}) takes the next `aria-rowindex`.
 *
 * @internal
 */
export function GridInfiniteScrollTrailer<T>({
	infiniteScroll,
	columns,
	pinning,
	ariaRowIndex,
}: {
	infiniteScroll: ResolvedInfiniteScroll
	columns: GridColumn<T>[]
	/** Frozen-column controls, so the pending row's skeleton cells stick like the loaded rows'. `null` when none. */
	pinning: GridColumnPinning | null
	/** The `aria-rowindex` after the last loaded row. A message row takes it while the row count holds the row. */
	ariaRowIndex: number
}): ReactElement | null {
	const { error, endMessage, loadingIndicator } = infiniteScroll

	const state = trailerState(infiniteScroll)

	const colSpan = columns.length

	const index = trailerCounted(infiniteScroll) ? ariaRowIndex : undefined

	if (state === 'error') {
		return (
			<tr data-slot="grid-load-error" aria-rowindex={index}>
				<TableCell colSpan={colSpan}>
					<Text tone="error">{error}</Text>
				</TableCell>
			</tr>
		)
	}

	if (state === 'loading') {
		return (
			// biome-ignore lint/a11y/noAriaHiddenOnFocusable: a non-focusable pending-state filler row that must not be exposed as a data row
			<tr data-slot="grid-loading-more" aria-hidden="true">
				{loadingIndicator ? (
					<td colSpan={colSpan}>{loadingIndicator}</td>
				) : (
					<GridSkeletonCells columns={columns} pinning={pinning} />
				)}
			</tr>
		)
	}

	if (state === 'end') {
		return (
			<tr data-slot="grid-load-end" aria-rowindex={index}>
				<TableCell colSpan={colSpan}>
					<Text tone="muted">{endMessage}</Text>
				</TableCell>
			</tr>
		)
	}

	return null
}
