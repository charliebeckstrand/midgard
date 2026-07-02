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
 * empty set, `'12 of 47 rows'` when a client-side filter narrows the source, or a
 * bare `'47 rows'` otherwise. Pluralized against the count it names.
 *
 * @internal
 */
function rowTotalLabel({ rows, total }: GridFooterStats): string {
	if (rows === 0) return 'No rows'

	if (total > rows) return `${rows} of ${total} ${total === 1 ? 'row' : 'rows'}`

	return `${rows} ${rows === 1 ? 'row' : 'rows'}`
}

/**
 * Opt-in summary footer for a {@link Grid}: a muted status bar rendering only the
 * enabled {@link GridFooterConfig} settings — a row-count total at the start, then
 * the selected-row count and any custom {@link GridFooterConfig.content} pushed to
 * the trailing edge. Renders nothing when no setting yields output, so an enabled
 * `footer` with, say, `selectedTotal` alone stays invisible until a row is
 * selected. Both counts are polite live regions so a filter or selection change is
 * announced without moving focus (WCAG 4.1.3).
 *
 * @internal
 */
export function GridFooter({ config, stats }: GridFooterProps) {
	if (!config || !stats) return null

	const showRowTotal = config.rowTotal === true

	const showSelected = config.selectedTotal === true && stats.selected > 0

	const content = config.content?.(stats)

	const hasTrailing = showSelected || content != null

	if (!showRowTotal && !hasTrailing) return null

	return (
		<div data-slot="grid-footer" className={cn(k.summary.bar)}>
			{showRowTotal && (
				<p role="status" className={cn(k.summary.item)}>
					{rowTotalLabel(stats)}
				</p>
			)}

			{hasTrailing && (
				<div className={cn(k.summary.trailing)}>
					{showSelected && (
						<p role="status" className={cn(k.summary.item)}>
							{stats.selected} selected
						</p>
					)}

					{content}
				</div>
			)}
		</div>
	)
}
