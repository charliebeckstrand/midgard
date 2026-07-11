'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { type DensityLevel, densityToSize } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import type { SortState } from './context'
import type { GridExportAction } from './engine/grid-export/types'
import type { PinSide } from './engine/grid-pin/overrides'
import {
	restrictToFirstScrollableAncestor,
	restrictToHorizontalAxis,
	restrictToVerticalAxis,
} from './engine/grid-reorder-compute'
import { GridContextMenu } from './grid-context-menu'
import type { GridGroupByContextValue } from './grid-group-by-button'
import { GridReorderContext } from './grid-reorder'
import { GridRowManagerDialog } from './grid-row-manager-dialog'
import type { GridColumn, GridContextMenu as GridContextMenuConfig, GridMenuItem } from './types'
import type { GridRowManagerRegionResult } from './use-grid-row-manager'

/**
 * Locks column drags to the x-axis and bounds them to the scroll container, so
 * horizontal auto-scroll can reach off-screen columns without running away. @internal
 */
const REORDER_MODIFIERS = [restrictToHorizontalAxis, restrictToFirstScrollableAncestor]

/**
 * Column-drag auto-scroll: horizontal only — a wide table scrolls sideways to
 * reach off-screen columns (bounded by the scroll-ancestor modifier above) —
 * with the vertical axis off so a downward drag can't scroll the body. @internal
 */
const REORDER_AUTO_SCROLL = { threshold: { x: 0.2, y: 0 } }

/** Locks a row drag to the y-axis and bounds it to the scroll container. @internal */
const ROW_REORDER_MODIFIERS = [restrictToVerticalAxis, restrictToFirstScrollableAncestor]

/**
 * Row-drag auto-scroll: vertical only — a tall grid scrolls up/down to reach
 * off-screen rows (bounded by the scroll-ancestor modifier) — with the
 * horizontal axis off so a sideways nudge can't scroll the columns. @internal
 */
const ROW_REORDER_AUTO_SCROLL = { threshold: { x: 0, y: 0.2 } }

/** Props for {@link GridRegion}. @internal */
type GridRegionProps<T> = {
	canReorder: boolean
	dndContextProps: ComponentProps<typeof DndContext>
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
	/** Active sort columns in priority order, so the header menu can offer "Clear sort" for a sorted column. */
	sort: SortState[]
	sortColumn: (column: string | number, direction: 'asc' | 'desc') => void
	clearSort: () => void
	/** Pins a column to an edge, or unpins it with `false`; backs the header menu's Pin items. */
	pinColumn: (column: string | number, side: PinSide | false) => void
	/** The group-by wiring, or `null` when the group button is off; backs the header menu's "Group by …" item. */
	groupBy: GridGroupByContextValue | null
	autoSizeColumns: (() => void) | null
	/** Re-fits a single column to its content; backs the header menu's "Auto-size this column" item. */
	autoSizeColumn: ((column: string | number) => void) | null
	chooseColumns: (() => void) | null
	/** One action per configured export type; empty when export is off. */
	exportActions: GridExportAction[]
	/** Resolves the group-header menu for a right-clicked group by key, or `null` when the row manager is off. */
	rowGroupMenu: ((key: string) => GridMenuItem[] | null) | null
	/** Resolves the column-group band menu for a right-clicked group by id. */
	columnGroupMenu: ((id: string) => GridMenuItem[] | null) | null
	children: ReactNode
}

/**
 * Wraps the table region in its interaction layers: the column-reorder dnd
 * context (when reorderable) nested inside the right-click context menu (when
 * configured). Split out of {@link GridData} so its body stays within the
 * cognitive-complexity budget.
 *
 * @internal
 */
export function GridRegion<T>({
	canReorder,
	dndContextProps,
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
	chooseColumns,
	exportActions,
	rowGroupMenu,
	columnGroupMenu,
	children,
}: GridRegionProps<T>) {
	const reordered = canReorder ? (
		<DndContext {...dndContextProps} modifiers={REORDER_MODIFIERS} autoScroll={REORDER_AUTO_SCROLL}>
			<SortableContext items={itemIds} strategy={strategy}>
				<GridReorderContext value={activeReorderId}>{children}</GridReorderContext>
			</SortableContext>
		</DndContext>
	) : (
		children
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
			chooseColumns={chooseColumns}
			exportActions={exportActions}
			rowGroupMenu={rowGroupMenu}
			columnGroupMenu={columnGroupMenu}
		>
			{reordered}
		</GridContextMenu>
	)
}

/**
 * Wraps the table region in the row drag-reorder `<DndContext>` when rows are
 * reorderable, else renders the region untouched. The context sits outside the
 * `<table>` (its injected a11y nodes must not be table children) and locks drags
 * to the y-axis, bounding them to the scroll container. Split out so
 * {@link GridData} stays within its complexity budget.
 *
 * @internal
 */
export function GridRowReorderRegion({
	active,
	dndContextProps,
	children,
}: {
	active: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	children: ReactNode
}) {
	if (!active) return children

	return (
		<DndContext
			{...dndContextProps}
			modifiers={ROW_REORDER_MODIFIERS}
			autoScroll={ROW_REORDER_AUTO_SCROLL}
		>
			{children}
		</DndContext>
	)
}

/**
 * Mounts the "Manage rows" dialog when the row manager is reachable (client
 * grouping + the header context menu), else renders nothing — keeping the
 * reachability branch off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function GridRowManagerRegionDialog({ region }: { region: GridRowManagerRegionResult }) {
	if (!region.reachable) return null

	return (
		<GridRowManagerDialog
			open={region.open}
			onOpenChange={region.setOpen}
			label="Manage rows"
			groups={region.managerGroups}
			onRecolor={region.recolor}
			onReorderGroups={region.reorderGroups}
		/>
	)
}

/**
 * Broadcasts the grid's resolved density onto the *table region* as a density
 * cascade, so size-aware *client* cell content (a `Sparkline`, an inline `Input`,
 * the selection checkbox) tracks the grid's `density` — and its `condensed` step,
 * which {@link resolveDensity} folds to `compact`. Scoped to the table on purpose
 * — it sits inside the context-menu trigger, below the toolbar/footer, so a
 * portaled overlay (context menu, dialog) the grid spawns stays on the ambient
 * density rather than inheriting the grid's. Static leaves (`Badge`, `Icon`,
 * `Text`) read no density; the `<table>` class down-projects those under
 * `condensed` (see `condensedTableClass`). A grid already at the ambient density
 * broadcasts its own level — a no-op. Kept a component so the branch lives here,
 * off {@link GridData}'s complexity budget. @internal
 */
export function DensityCascade({ level, children }: { level: DensityLevel; children: ReactNode }) {
	return <Density scale={densityToSize[level]}>{children}</Density>
}

/** Props for {@link GridScrollRegion}. @internal */
type GridScrollRegionProps = {
	/** Whether the table needs the scroll wrapper (sticky header or virtualization). */
	active: boolean
	scrollRef: RefObject<HTMLDivElement | null>
	maxHeight: string | undefined
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
	children,
}: GridScrollRegionProps) {
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
