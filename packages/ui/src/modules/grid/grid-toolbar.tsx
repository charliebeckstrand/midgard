'use client'

import { SlidersHorizontal } from 'lucide-react'
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
	/** Render the column-manager trigger at the end of the top row. */
	showColumnManager: boolean
	/** Label on the column-manager trigger (matches the dialog title). */
	columnManagerLabel: ReactNode
	/** Opens the column-manager dialog. */
	onManageColumns: () => void
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
 * assembled. The top row carries the quick-search field at the start and the
 * column-manager trigger at the end; a second row hosts the batch actions while a
 * row is selected, so the search stays reachable beside them. Each action cluster
 * is its own labelled {@link Toolbar} — "Column management" and "Batch actions" —
 * while the search stays a plain field, so the toolbars' roving-tabindex arrow
 * navigation never swallows the text cursor.
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
	batchActions,
	hasSelection,
	selection,
	setSelection,
}: GridToolbarProps) {
	const showBatch = Boolean(batchActions) && hasSelection

	const showTopRow = Boolean(filter) || showColumnManager

	if (!showTopRow && !showBatch) return null

	return (
		<div data-slot="grid-toolbar" className={cn(k.toolbar.root)}>
			{showTopRow && (
				<div className={cn(k.toolbar.bar)}>
					{filter && <GridFilter filter={filter} />}

					{showColumnManager && (
						<Toolbar aria-label="Column management" className={cn(k.toolbar.actions)}>
							<Button variant="plain" aria-haspopup="dialog" onClick={onManageColumns}>
								<Icon icon={<SlidersHorizontal />} />
								{columnManagerLabel}
							</Button>
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
