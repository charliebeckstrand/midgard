'use client'

import type { ReactElement } from 'react'
import { TableCell } from '../../components/table'
import { Text } from '../../components/text'
import { hasErrorSlot } from './engine/grid-data/guards'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import { GridSkeletonCells } from './grid-skeleton-cells'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

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
 * `aria-hidden` filler — the busy status announces the grown total — while the
 * message rows carry real text and stay in the tree.
 *
 * @internal
 */
export function GridInfiniteScrollTrailer<T>({
	infiniteScroll,
	columns,
	pinning,
}: {
	infiniteScroll: ResolvedInfiniteScroll
	columns: GridColumn<T>[]
	/** Frozen-column controls, so the pending row's skeleton cells stick like the loaded rows'. `null` when none. */
	pinning: GridColumnPinning | null
}): ReactElement | null {
	const { error, loadingMore, showLoadingIndicator, hasMore, endMessage, loadingIndicator } =
		infiniteScroll

	const colSpan = columns.length

	if (hasErrorSlot(error)) {
		return (
			<tr data-slot="grid-load-error">
				<TableCell colSpan={colSpan}>
					<Text tone="error">{error}</Text>
				</TableCell>
			</tr>
		)
	}

	if (loadingMore && showLoadingIndicator) {
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

	if (!hasMore && endMessage != null && endMessage !== false) {
		return (
			<tr data-slot="grid-load-end">
				<TableCell colSpan={colSpan}>
					<Text tone="muted">{endMessage}</Text>
				</TableCell>
			</tr>
		)
	}

	return null
}
