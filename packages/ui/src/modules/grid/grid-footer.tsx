'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridFooter as GridFooterConfig, GridFooterStats } from './grid-data-types'

/** Props for {@link GridFooter}. @internal */
type GridFooterProps = {
	/** The footer configuration, or `undefined` when the grid has no `footer` (renders nothing). */
	config: GridFooterConfig | undefined
	/** Live row counts, or `null` when there is no configured footer to feed. */
	stats: GridFooterStats | null
}

/**
 * The row-count label for {@link GridFooterConfig.rowTotal}: `'No rows'` for an
 * empty set, `'12 of 47 rows visible'` when a client-side filter narrows the
 * source, or a bare `'47 rows'` otherwise. Pluralized against the count it names.
 *
 * @internal
 */
function rowTotalLabel({ rows, total }: GridFooterStats): string {
	if (rows === 0) return 'No rows'

	if (total > rows) return `${rows} of ${total} rows visible`

	return `${rows} ${rows === 1 ? 'row' : 'rows'}`
}

/**
 * The selected-count label for {@link GridFooterConfig.selectedTotal}, nested
 * against the visible extent: `'3 of 12 rows selected'`. The denominator is the
 * post-filter row count, so the label carries the visible context even as it
 * replaces the row total (see {@link GridFooter}). Only rendered while a
 * selection is active, so `selected` is always at least one.
 *
 * @internal
 */
function selectedLabel({ rows, selected }: GridFooterStats): string {
	return `${selected} of ${rows} ${rows === 1 ? 'row' : 'rows'} selected`
}

/**
 * Opt-in summary footer for a {@link Grid}: a muted status bar with a single
 * leading count that swaps by precedence — an active selection
 * (`'3 of 12 rows selected'`) replaces the row-count total
 * (`'12 of 47 rows visible'` while filtered, else a bare `'47 rows'`) in place,
 * never stacking, so the bar stays one concise line. Because the selected label
 * nests against the visible extent, its denominator preserves the filter context
 * the total would otherwise show. Any custom {@link GridFooterConfig.content} is
 * pushed to the trailing edge. Renders nothing when no setting yields output, so
 * an enabled `footer` with, say, `selectedTotal` alone stays invisible until a
 * row is selected. The count is a polite live region so a filter or selection
 * change is announced without moving focus (WCAG 4.1.3).
 *
 * @internal
 */
export function GridFooter({ config, stats }: GridFooterProps) {
	if (!config || !stats) return null

	const showSelected = config.selectedTotal === true && stats.selected > 0

	const showRowTotal = config.rowTotal === true

	// One leading status, chosen by precedence: an active selection replaces the
	// row-count total in place, its `of` denominator keeping the visible context.
	const status = showSelected ? selectedLabel(stats) : showRowTotal ? rowTotalLabel(stats) : null

	const content = config.content?.(stats)

	if (status == null && content == null) return null

	return (
		<div data-slot="grid-footer" className={cn(k.summary.bar)}>
			{status != null && (
				<p role="status" className={cn(k.summary.item)}>
					{status}
				</p>
			)}

			{content != null && <div className={cn(k.summary.trailing)}>{content}</div>}
		</div>
	)
}
