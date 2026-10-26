'use client'

import { Download, SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { LoadingSpinner } from '../../components/loading'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { Toolbar } from '../../components/toolbar'
import { ariaAttr, cn, dataAttr } from '../../core'
import { useStableEvent } from '../../hooks/use-stable-event'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/grid'
import { getTabbableElements } from '../../utilities/focusable-selector'
import type { GridExportAction } from './engine/grid-export/types'
import { gridMessages } from './engine/grid-messages'
import { preloadDataDialogs } from './grid-data-dialogs'
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
	/** The consumer's own content for the top row. @see {@link GridDataProps.toolbar} */
	content: ReactNode
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
	 * Whether an async export is in flight: from this dropdown or from a right-click
	 * menu, since the grid counts them in one place (see {@link useGridExport}). Swaps
	 * the trigger's download icon for a spinner and gates re-activation until it
	 * settles; the grid's own "Exporting" overlay reads the same fact.
	 */
	exporting: boolean
	/**
	 * Per-column filter controls, or `null` when no column is filterable. Backs the
	 * "Clear filters" button, shown only while a filter constrains rows.
	 */
	columnFilters: GridColumnFilter | null
	/** Batch-action builder; its controls fill the second row while a row is selected. */
	batchActions: GridSelection['batchActions']
	/** Whether at least one row is selected: gates the batch-action row. */
	hasSelection: boolean
	/** Live selection handed to {@link GridToolbarProps.batchActions}. */
	selection: Set<string | number>
	/** Selection setter handed to {@link GridToolbarProps.batchActions}. */
	setSelection: (next: Set<string | number>) => void
}

/** Props for {@link GridExportMenu}. @internal */
type GridExportMenuProps = Pick<GridToolbarProps, 'exportActions' | 'exporting'>

/**
 * The "Export" dropdown of the tools cluster: one menu item for each action.
 *
 * While an export runs, the trigger shows a spinner in place of the download
 * icon and ignores activation. The trigger does not use `disabled` for this
 * gate. A browser moves focus off a disabled button, so a keyboard user that
 * starts an export lands on `body`. The trigger thus uses `aria-disabled`, and
 * the open handler refuses to open the menu. The trigger keeps focus.
 *
 * @internal
 */
function GridExportMenu({ exportActions, exporting }: GridExportMenuProps) {
	const intl = useIntl()

	const [open, setOpen] = useState(false)

	return (
		<Menu placement="bottom-start" open={open} onOpenChange={(next) => setOpen(next && !exporting)}>
			<MenuTrigger>
				{/* The spinner takes the prefix slot of the download icon, so the two
				    never show together. */}
				<Button
					type="button"
					variant="plain"
					prefix={
						exporting ? (
							<LoadingSpinner label={intl.formatMessage(intlMessages.loading)} />
						) : (
							<Icon icon={<Download />} />
						)
					}
					aria-disabled={ariaAttr(exporting)}
					data-disabled={dataAttr(exporting)}
				>
					{intl.formatMessage(gridMessages.export)}
				</Button>
			</MenuTrigger>
			<MenuContent>
				{exportActions.map((action) => (
					// The action carries its own pending tracking, so firing it is all
					// this item does: the trigger's spinner and the grid's overlay both
					// follow from the count it flips.
					<MenuItem key={action.type} onAction={action.run}>
						<MenuLabel>{action.label}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}

/**
 * The element that takes focus from a control that unmounts: "Clear filters",
 * or a batch action that empties the selection. It is the search field of the
 * toolbar when it has one, else the first Tab stop of the table that follows
 * the toolbar. The control unmounts in the commit that clears the filters or
 * the selection, so the browser drops focus to `body` unless it moves first
 * (WCAG 2.4.3).
 *
 * @internal
 */
function toolbarFocusFallback(toolbar: HTMLElement): HTMLElement | undefined {
	const search = toolbar.querySelector<HTMLElement>('[data-slot="grid-filter"] input')

	if (search) return search

	return getTabbableElements(toolbar.closest('[data-slot="grid"]')).find(
		(element) =>
			element.closest('table') !== null &&
			Boolean(toolbar.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
	)
}

/**
 * The Grid's toolbar region: the single place its above-table controls are
 * assembled. The top row carries the quick-search field at the start, and a
 * "Table tools" cluster at the end. While a column filter constrains rows, an
 * amber "Clear filters" button joins the search and lifts them all. The tools
 * cluster holds the column-manager trigger and, when any export type is active,
 * an "Export" dropdown listing one item per action. That dropdown's trigger
 * swaps the download icon for a spinner while an async export is in flight. The
 * export can start from this dropdown or from a right-click menu. A second row
 * hosts the batch actions while a row is selected, so the search stays reachable
 * beside them. The tools and batch actions are each their own labeled
 * {@link Toolbar}: "Table tools" and "Batch actions". The search stays a plain
 * field, so the toolbars' roving-tabindex arrow navigation never swallows the
 * text cursor.
 *
 * Renders nothing when none of its slots are active, so an unconfigured grid
 * carries no toolbar chrome (and no stray gap above the table).
 *
 * @internal
 */
export function GridToolbar({
	filter,
	content,
	showColumnManager,
	columnManagerLabel,
	onManageColumns,
	exportActions,
	exporting,
	columnFilters,
	batchActions,
	hasSelection,
	selection,
	setSelection,
}: GridToolbarProps) {
	const intl = useIntl()

	const toolbarRef = useRef<HTMLDivElement>(null)

	const batchRef = useRef<HTMLDivElement>(null)

	// An empty selection unmounts the batch row. Move focus out of it first, as
	// "Clear filters" does. A stable event, because the batch actions get it in
	// render and it reads refs.
	const setBatchSelection = useStableEvent((next: Set<string | number>) => {
		const toolbar = toolbarRef.current

		if (next.size === 0 && toolbar && batchRef.current?.contains(document.activeElement)) {
			toolbarFocusFallback(toolbar)?.focus()
		}

		setSelection(next)
	})

	const showExport = exportActions.length > 0

	const showTools = showColumnManager || showExport

	const showBatch = Boolean(batchActions) && hasSelection

	const hasActiveFilters = columnFilters?.active ?? false

	const showTopRow = Boolean(filter) || hasActiveFilters || showTools || Boolean(content)

	if (!showTopRow && !showBatch) return null

	return (
		<div ref={toolbarRef} data-slot="grid-toolbar" className={cn(k.toolbar.base)}>
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
							onClick={() => {
								// Move focus before the clear unmounts this button.
								if (toolbarRef.current) toolbarFocusFallback(toolbarRef.current)?.focus()

								columnFilters?.clear()
							}}
						>
							{intl.formatMessage(gridMessages.clearFilters)}
						</Button>
					)}

					{/* The consumer's own, across from the search and ahead of the tools.
					    It is the grid's row to lay out. A filter the consumer adds belongs
					    beside the one the grid renders, rather than under it. */}
					{content ? <div className={cn(k.toolbar.content)}>{content}</div> : null}

					{showTools && (
						<Toolbar
							aria-label={intl.formatMessage(gridMessages.tableTools)}
							// The content ahead already takes the free space. A second auto
							// margin would split it and open a gap between the two.
							className={cn(!content && k.toolbar.actions)}
						>
							{showColumnManager && (
								<Button
									type="button"
									variant="plain"
									aria-haspopup="dialog"
									onClick={onManageColumns}
									onPointerEnter={preloadDataDialogs}
									onFocus={preloadDataDialogs}
								>
									<Icon icon={<SlidersHorizontal />} />
									{columnManagerLabel}
								</Button>
							)}

							{showExport && <GridExportMenu exportActions={exportActions} exporting={exporting} />}
						</Toolbar>
					)}
				</div>
			)}

			{showBatch && (
				<Toolbar ref={batchRef} aria-label={intl.formatMessage(gridMessages.batchActions)}>
					{batchActions?.({ selection, setSelection: setBatchSelection })}
				</Toolbar>
			)}
		</div>
	)
}
