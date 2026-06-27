'use client'

import { Download, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridSelection } from './grid-data-types'
import { GridFilter } from './grid-filter'
import type { GridGlobalFilterView } from './use-grid-table'

/** Props for {@link GridToolbar}. @internal */
type GridToolbarProps = {
	/**
	 * Quick-search view when the grid is searchable; renders the search field at
	 * the start of the top row. `null` drops the field.
	 */
	filter: GridGlobalFilterView | null
	/** Render the column-manager trigger in the tools cluster at the end of the top row. */
	showColumnManager: boolean
	/** Label on the column-manager trigger (matches the dialog title). */
	columnManagerLabel: ReactNode
	/** Opens the column-manager dialog. */
	onManageColumns: () => void
	/** Render the CSV-export trigger in the tools cluster at the end of the top row. */
	showExport?: boolean
	/** Label on the export trigger (matches the header menu's "Export to CSV" item). */
	exportLabel?: ReactNode
	/** Downloads the filtered/sorted rows as CSV; `null` when export is off. */
	onExport?: (() => void) | null
	/** Batch-action builder; its controls fill the second row while a row is selected. */
	batchActions: GridSelection['batchActions']
	/** Whether at least one row is selected — gates the batch-action row. */
	hasSelection: boolean
	/** Live selection handed to {@link GridToolbarProps.batchActions}. */
	selection: Set<string | number>
	/** Selection setter handed to {@link GridToolbarProps.batchActions}. */
	setSelection: (next: Set<string | number>) => void
}

/**
 * The Grid's toolbar region: the single place its above-table controls are
 * assembled. The top row carries the quick-search field at the start and a
 * "Table tools" cluster at the end — the column-manager trigger and the
 * CSV-export trigger, each shown when enabled; a second row hosts the batch
 * actions while a row is selected, so the search stays reachable beside them. The
 * tools and batch actions are each their own labelled {@link Toolbar} — "Table
 * tools" and "Batch actions" — while the search stays a plain field, so the
 * toolbars' roving-tabindex arrow navigation never swallows the text cursor.
 *
 * Renders nothing when none of its slots are active, so an unconfigured grid
 * carries no toolbar chrome (and no stray gap above the table).
 *
 * @internal
 */
export function GridToolbar({
	filter,
	showColumnManager,
	columnManagerLabel,
	onManageColumns,
	showExport = false,
	exportLabel,
	onExport,
	batchActions,
	hasSelection,
	selection,
	setSelection,
}: GridToolbarProps) {
	const showExportButton = showExport && Boolean(onExport)

	const showTools = showColumnManager || showExportButton

	const showBatch = Boolean(batchActions) && hasSelection

	const showTopRow = Boolean(filter) || showTools

	if (!showTopRow && !showBatch) return null

	return (
		<div data-slot="grid-toolbar" className={cn(k.toolbar.root)}>
			{showTopRow && (
				<div className={cn(k.toolbar.bar)}>
					{filter && <GridFilter filter={filter} />}

					{showTools && (
						<Toolbar aria-label="Table tools" className={cn(k.toolbar.actions)}>
							{showColumnManager && (
								<Button variant="plain" aria-haspopup="dialog" onClick={onManageColumns}>
									<Icon icon={<SlidersHorizontal />} />
									{columnManagerLabel}
								</Button>
							)}

							{showExportButton && (
								<Button variant="plain" onClick={() => onExport?.()}>
									<Icon icon={<Download />} />
									{exportLabel}
								</Button>
							)}
						</Toolbar>
					)}
				</div>
			)}

			{showBatch && (
				<Toolbar aria-label="Batch actions">{batchActions?.({ selection, setSelection })}</Toolbar>
			)}
		</div>
	)
}
