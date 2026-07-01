'use client'

import { Download, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridExportAction } from './export/types'
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
	/**
	 * One action per configured export type. Renders an "Export" dropdown in the
	 * tools cluster listing one menu item per action; empty hides it entirely.
	 */
	exportActions: GridExportAction[]
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
 * "Table tools" cluster at the end — the column-manager trigger and, when any
 * export type is active, an "Export" dropdown listing one item per action; a
 * second row hosts the batch actions while a row is selected, so the search
 * stays reachable beside them. The tools and batch actions are each their own
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
	batchActions,
	hasSelection,
	selection,
	setSelection,
}: GridToolbarProps) {
	const showExport = exportActions.length > 0

	const showTools = showColumnManager || showExport

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

							{showExport && (
								<Menu placement="bottom-start">
									<MenuTrigger>
										<Button variant="plain">
											<Icon icon={<Download />} />
											Export
										</Button>
									</MenuTrigger>
									<MenuContent>
										{exportActions.map((action) => (
											<MenuItem key={action.type} onAction={action.run}>
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
