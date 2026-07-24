'use client'

import { Download, SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridExportAction } from './engine/grid-export/types'
import type { GridSelection } from './grid-data-types'
import { GridFilter } from './grid-filter'
import type { GridColumnFilter, GridGlobalFilterView } from './use-grid-table'

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
	/**
	 * One action per configured export type. Renders an "Export" dropdown in the
	 * tools cluster listing one menu item per action; empty hides it entirely.
	 */
	exportActions: GridExportAction[]
	/**
	 * Per-column filter controls, or `null` when no column is filterable. Backs the
	 * "Clear all filters" button, shown only while a filter constrains rows.
	 */
	columnFilters: GridColumnFilter | null
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
 * assembled. The top row carries the quick-search field at the start — joined,
 * while a column filter constrains rows, by an amber "Clear all filters" button
 * that lifts them all — and a "Table tools" cluster at the end: the
 * column-manager trigger and, when any export type is active, an "Export"
 * dropdown listing one item per action — its trigger swaps the download icon
 * for a spinner while an async export is in flight; a second row hosts the batch actions
 * while a row is selected, so the search stays reachable beside them. The tools
 * and batch actions are each their own
 * labelled {@link Toolbar} — "Table tools" and "Batch actions" — while the
 * search stays a plain field, so the toolbars' roving-tabindex arrow
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
	exportActions,
	columnFilters,
	batchActions,
	hasSelection,
	selection,
	setSelection,
}: GridToolbarProps) {
	const showExport = exportActions.length > 0

	// Tracks an async export (an `exportRows` server round-trip) kicked off from
	// the dropdown; a synchronous export downloads on the click itself, so it
	// never flips this. While set, the trigger's `loading` swaps the download
	// icon for the spinner and gates re-activation until the run settles.
	const [exporting, setExporting] = useState(false)

	const runExport = (action: GridExportAction) => {
		const pending = action.run()

		if (pending instanceof Promise) {
			setExporting(true)

			void pending.finally(() => setExporting(false))
		}
	}

	const showTools = showColumnManager || showExport

	const showBatch = Boolean(batchActions) && hasSelection

	const hasActiveFilters = columnFilters?.hasActive() ?? false

	const showTopRow = Boolean(filter) || hasActiveFilters || showTools

	if (!showTopRow && !showBatch) return null

	return (
		<div data-slot="grid-toolbar" className={cn(k.toolbar.root)}>
			{showTopRow && (
				<div className={cn(k.toolbar.bar)}>
					{filter && <GridFilter filter={filter} />}

					{/* Grouped with the search on the row's start (filter-related), across
					    from the table tools; surfaces only while a filter constrains rows. */}
					{hasActiveFilters && (
						<Button
							type="button"
							variant="soft"
							color="amber"
							onClick={() => columnFilters?.clear()}
						>
							Clear all filters
						</Button>
					)}

					{showTools && (
						<Toolbar aria-label="Table tools" className={cn(k.toolbar.actions)}>
							{showColumnManager && (
								<Button
									type="button"
									variant="plain"
									aria-haspopup="dialog"
									onClick={onManageColumns}
								>
									<Icon icon={<SlidersHorizontal />} />
									{columnManagerLabel}
								</Button>
							)}

							{showExport && (
								<Menu placement="bottom-start">
									<MenuTrigger>
										{/* The download icon rides the prefix slot so `loading`
										    replaces it with the spinner rather than adding one
										    beside it. */}
										<Button
											type="button"
											variant="plain"
											prefix={<Icon icon={<Download />} />}
											loading={exporting}
										>
											Export
										</Button>
									</MenuTrigger>
									<MenuContent>
										{exportActions.map((action) => (
											<MenuItem key={action.type} onAction={() => runExport(action)}>
												<MenuLabel>{action.label}</MenuLabel>
											</MenuItem>
										))}
									</MenuContent>
								</Menu>
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
