'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import { cn, createContext } from '../../core'
import type { DensityStep } from '../../core/density'
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '../../hooks/use-sortable-list'
import { Density } from '../../primitives/density'
import { k } from '../../recipes/kata/grid'
import type { GridSortState } from './context'
import type { GridExportAction } from './engine/grid-export/types'
import type { PinSide } from './engine/grid-pin/overrides'
import { restrictToFirstScrollableAncestor } from './engine/grid-reorder-compute'
import { GridContextMenu } from './grid-context-menu'
import type { GridGroupByContextValue } from './grid-group-by-button'
import { GridManagerDialog } from './grid-manager-dialog'
import { GridReorderContext } from './grid-reorder'
import { GridRowManager } from './grid-row-manager'
import type { GridColumn, GridContextMenu as GridContextMenuConfig, GridMenuItem } from './types'
import { useGridClampAnchor } from './use-grid-clamp-anchor'
import type { GridRowManagerRegionResult } from './use-grid-row-manager'
import type { GridColumnFilter } from './use-grid-table'

/**
 * Locks column drags to the x-axis and bounds them to the scroll container, so
 * horizontal auto-scroll can reach off-screen columns without running away. @internal
 */
const REORDER_MODIFIERS = [restrictToHorizontalAxis, restrictToFirstScrollableAncestor]

/**
 * Column-drag auto-scroll, horizontal only. A wide table scrolls sideways to
 * reach off-screen columns, bounded by the scroll-ancestor modifier above. The
 * vertical axis is off, so a downward drag can't scroll the body.
 *
 * @internal
 */
const REORDER_AUTO_SCROLL = { threshold: { x: 0.2, y: 0 } }

/** Locks a row drag to the y-axis and bounds it to the scroll container. @internal */
const ROW_REORDER_MODIFIERS = [restrictToVerticalAxis, restrictToFirstScrollableAncestor]

/**
 * Row-drag auto-scroll, vertical only. A tall grid scrolls up/down to reach
 * off-screen rows, bounded by the scroll-ancestor modifier. The horizontal axis
 * is off, so a sideways nudge can't scroll the columns.
 *
 * @internal
 */
const ROW_REORDER_AUTO_SCROLL = { threshold: { x: 0, y: 0.2 } }

/** The column sortable items while column reorder is not live. @internal */
const NO_ITEMS: ComponentProps<typeof SortableContext>['items'] = []

/** Props for {@link GridRegion}. @internal */
type GridRegionProps<T> = {
	/**
	 * Whether the grid takes column or row reorder at all, from its props alone.
	 * The drag context mounts on this, so a change in the live gates below never
	 * remounts the table.
	 */
	reorderConfigured: boolean
	/** Whether column reorder is live now. */
	canReorder: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	/** Whether row reorder is live now. It stands column reorder down. */
	rowReorderActive: boolean
	rowDndContextProps: ComponentProps<typeof DndContext>
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
	/** Id of the column being dragged, or `null`; handed to the reordering body cells for their lift cue. */
	activeReorderId: string | null
	contextMenu: GridContextMenuConfig<T> | undefined
	/** Behavioral gate for the menus; the wrapper stays mounted either way (see GridContextMenu.enabled). */
	contextMenuEnabled: boolean
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	/** Active sort columns in priority order; backs the header menu's Sort items. */
	sort: GridSortState[]
	sortColumn: (column: string | number, direction: 'asc' | 'desc') => void
	clearSort: () => void
	/** Pins a column to an edge, or unpins it with `false`; backs the header menu's Pin items. */
	pinColumn: (column: string | number, side: PinSide | false) => void
	/** The group-by wiring, or `null` when the group button is off; backs the header menu's "Group by …" item. */
	groupBy: GridGroupByContextValue | null
	autoSizeColumns: (() => void) | null
	/** Sizes a single column to its content; backs the header menu's "Auto-size this column" item. */
	autoSizeColumn: ((column: string | number) => void) | null
	/** Gives the widths back to the automatic fit; backs the header menu's "Reset column widths" item. */
	resetColumnWidths: (() => void) | null
	chooseColumns: (() => void) | null
	/** One action per configured export type; empty when export is off. */
	exportActions: GridExportAction[]
	/** Resolves the group-header menu for a right-clicked group by key, or `null` when the row manager is off. */
	rowGroupMenu: ((key: string) => GridMenuItem[] | null) | null
	/** Resolves the column-group band menu for a right-clicked group by id. */
	columnGroupMenu: ((id: string) => GridMenuItem[] | null) | null
	/** The grid's column-filter model, or `null` when it has none; backs the column menu's "Filter …" item. */
	columnFilter: GridColumnFilter | null
	children: ReactNode
}

/**
 * Wraps the table region in its interaction layers: the reorder dnd context
 * (when the grid takes column or row reorder, see {@link GridReorderRegion})
 * nested inside the right-click context menu (when configured). Split out of
 * {@link GridData} so its body stays within the cognitive-complexity budget.
 *
 * @internal
 */
export function GridRegion<T>({
	reorderConfigured,
	canReorder,
	dndContextProps,
	rowReorderActive,
	rowDndContextProps,
	itemIds,
	strategy,
	activeReorderId,
	contextMenu,
	contextMenuEnabled,
	columns,
	rows,
	rowKeys,
	sort,
	sortColumn,
	clearSort,
	pinColumn,
	groupBy,
	autoSizeColumns,
	autoSizeColumn,
	resetColumnWidths,
	chooseColumns,
	exportActions,
	rowGroupMenu,
	columnGroupMenu,
	columnFilter,
	children,
}: GridRegionProps<T>) {
	const reordered = (
		<GridReorderRegion
			configured={reorderConfigured}
			canReorder={canReorder}
			dndContextProps={dndContextProps}
			rowReorderActive={rowReorderActive}
			rowDndContextProps={rowDndContextProps}
			itemIds={itemIds}
			strategy={strategy}
			activeReorderId={activeReorderId}
		>
			{children}
		</GridReorderRegion>
	)

	if (!contextMenu) return reordered

	return (
		<GridContextMenu
			config={contextMenu}
			enabled={contextMenuEnabled}
			columns={columns}
			rows={rows}
			rowKeys={rowKeys}
			sort={sort}
			sortColumn={sortColumn}
			clearSort={clearSort}
			pinColumn={pinColumn}
			groupBy={groupBy}
			autoSizeColumns={autoSizeColumns}
			autoSizeColumn={autoSizeColumn}
			resetColumnWidths={resetColumnWidths}
			chooseColumns={chooseColumns}
			exportActions={exportActions}
			rowGroupMenu={rowGroupMenu}
			columnGroupMenu={columnGroupMenu}
			columnFilter={columnFilter}
		>
			{reordered}
		</GridContextMenu>
	)
}

/** Props for {@link GridReorderRegion}. @internal */
type GridReorderRegionProps = Pick<
	GridRegionProps<unknown>,
	| 'canReorder'
	| 'dndContextProps'
	| 'rowReorderActive'
	| 'rowDndContextProps'
	| 'itemIds'
	| 'strategy'
	| 'activeReorderId'
	| 'children'
> & {
	/** Whether the grid takes column or row reorder at all, from its props alone. */
	configured: boolean
}

/**
 * The reorder dnd context around the table region, or the region untouched
 * when the grid takes no reorder.
 *
 * @remarks One `DndContext` serves both reorders, and it switches mode instead
 * of mounting. The live gates follow the sort, the filter, loading, and the
 * rows, and a wrapper that came and went with them remounted the table: the
 * focused sort button was lost on the click that sorted. With no live mode no
 * sortable renders, so no drag starts. The sensors stay the same in each mode:
 * dnd-kit keys an effect on the sensor list, and React logs an error when the
 * length of the list changes. The context sits outside the `<table>`, because
 * its injected a11y nodes must not be table children. The row
 * sortables sit in the body and the column sortables in the head, so each mode
 * has one nearest context.
 *
 * @internal
 */
function GridReorderRegion({
	configured,
	canReorder,
	dndContextProps,
	rowReorderActive,
	rowDndContextProps,
	itemIds,
	strategy,
	activeReorderId,
	children,
}: GridReorderRegionProps) {
	if (!configured) return children

	const mode = rowReorderActive ? 'row' : canReorder ? 'column' : null

	const contextProps = mode === 'row' ? rowDndContextProps : dndContextProps

	return (
		<DndContext
			{...contextProps}
			sensors={contextProps.sensors}
			modifiers={mode === 'row' ? ROW_REORDER_MODIFIERS : REORDER_MODIFIERS}
			autoScroll={mode === 'row' ? ROW_REORDER_AUTO_SCROLL : REORDER_AUTO_SCROLL}
		>
			<SortableContext items={mode === 'column' ? itemIds : NO_ITEMS} strategy={strategy}>
				<GridReorderContext value={mode === 'column' ? activeReorderId : null}>
					{children}
				</GridReorderContext>
			</SortableContext>
		</DndContext>
	)
}

/**
 * Mounts the "Manage rows" dialog when the row manager is reachable (client
 * grouping + the header context menu), else renders nothing. That keeps the
 * reachability branch off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function GridRowManagerRegionDialog({ region }: { region: GridRowManagerRegionResult }) {
	if (!region.reachable) return null

	return (
		<GridManagerDialog open={region.open} onOpenChange={region.setOpen} label="Manage rows">
			<GridRowManager
				groups={region.managerGroups}
				onRecolor={region.recolor}
				onReorderGroups={region.reorderGroups}
			/>
		</GridManagerDialog>
	)
}

/**
 * The step of the nearest density scope around the grid, read above the scope
 * of its table. An overlay that the grid spawns renders at it, rather than at
 * the tightened step of its cells. It is `md` outside a grid. The one reader is
 * {@link GridOverlayDensity}, so no other file reads the step in JS through it.
 *
 * @internal
 */
const [GridOverlayDensityContext, useGridOverlayDensity] = createContext<DensityStep>(
	'GridOverlayDensity',
	{ default: 'md' },
)

export { GridOverlayDensityContext }

/**
 * Restores the step around the grid inside an overlay whose trigger lives in
 * the table region, so a *dialog-sized* surface isn't sized like a *cell*.
 *
 * A portal is a DOM escape, not a React one. The surface stays a descendant of
 * the trigger, so it inherits the scope of the table unless something says otherwise.
 * Only the surface is wrapped, never the trigger — the trigger is header chrome
 * and belongs at the header's density.
 *
 * @internal
 */
export function GridOverlayDensity({ children }: { children: ReactNode }) {
	const step = useGridOverlayDensity()

	return <Density step={step}>{children}</Density>
}

/** Props for {@link GridScrollRegion}. @internal */
type GridScrollRegionProps = {
	/** Whether the table needs the scroll wrapper (sticky header or virtualization). */
	active: boolean
	scrollRef: RefObject<HTMLDivElement | null>
	maxHeight: string | undefined
	/** Whether the table holds a master-detail body. */
	expandable: boolean
	/** Whether the table holds a grouped body, under client or manual grouping. */
	grouped: boolean
	/** Whether the body is a window. A flat master-detail or grouped body clears the native scroll anchor after a clamp (see {@link useGridClampAnchor}). */
	virtualized: boolean
	children: ReactNode
}

/**
 * The sticky/virtualized scroll container around the table, or the table
 * untouched when no scroll wrapper is needed. `maxHeight="fill"` sizes by
 * flexing into the parent's box (see `k.fill`) rather than an inline cap; any
 * other value caps the wrapper directly. Split out of {@link GridData} so the
 * branching stays off its complexity budget. @internal
 */
export function GridScrollRegion({
	active,
	scrollRef,
	maxHeight,
	expandable,
	grouped,
	virtualized,
	children,
}: GridScrollRegionProps) {
	useGridClampAnchor(scrollRef, active && (expandable || grouped) && !virtualized)

	if (!active) return children

	const fillHeight = maxHeight === 'fill'

	return (
		<div
			ref={scrollRef}
			data-slot="grid-scroll"
			className={cn(k.sticky.wrapper, fillHeight && k.fill.scroll)}
			style={maxHeight && !fillHeight ? { maxHeight } : undefined}
		>
			{children}
		</div>
	)
}
