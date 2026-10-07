'use client'

import type { ReactNode, RefObject } from 'react'
import { TableScrollsContext } from '../../components/table/context'
import { cn, createContext } from '../../core'
import type { DensityStep } from '../../core/density'
import type { SortableListOptions } from '../../hooks/use-sortable-list'
import { Density } from '../../primitives/density'
import { k } from '../../recipes/kata/grid'
import { GridContextMenu, type GridContextMenuProps } from './grid-context-menu'
import { gridLazyModule, useGridLazyModule } from './grid-lazy-module'
import type { GridColumn, GridContextMenu as GridContextMenuConfig } from './types'
import { useGridClampAnchor } from './use-grid-clamp-anchor'
import type { GridRowItem } from './use-grid-row-reorder'

/**
 * The drag and drop module of the grid. It carries dnd-kit, so a grid that
 * takes no reorder does not load it.
 *
 * @internal
 */
const reorderKit = gridLazyModule(() => import('./grid-reorder-region'))

/**
 * Loads the drag and drop module. Tests call it before a case that drags.
 * @internal
 */
export const loadGridReorderKit = reorderKit.load

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
	/** The options of the column sortable. */
	columnSortable: SortableListOptions<GridColumn<T>>
	/** Whether row reorder is live now. It stands column reorder down. */
	rowReorderActive: boolean
	/** The options of the row sortable. */
	rowSortable: SortableListOptions<GridRowItem<T>>
	/** The right-click menu config, or `undefined` with no menu. */
	contextMenu: GridContextMenuConfig<T> | undefined
	/** Behavioral gate for the menus; the wrapper stays mounted either way (see GridContextMenu.enabled). */
	contextMenuEnabled: boolean
	children: ReactNode
} & Omit<GridContextMenuProps<T>, 'config' | 'enabled' | 'children'>

/**
 * Wraps the table region in its interaction layers: the reorder dnd context
 * (when the grid takes column or row reorder, see {@link GridReorderHost})
 * nested inside the right-click context menu (when configured). Split out of
 * {@link GridData} so its body stays within the cognitive-complexity budget.
 *
 * @internal
 */
export function GridRegion<T>({
	reorderConfigured,
	canReorder,
	columnSortable,
	rowReorderActive,
	rowSortable,
	contextMenu,
	contextMenuEnabled,
	children,
	...menu
}: GridRegionProps<T>) {
	const reordered = (
		<GridReorderHost
			configured={reorderConfigured}
			canReorder={canReorder}
			columnSortable={columnSortable}
			rowReorderActive={rowReorderActive}
			rowSortable={rowSortable}
		>
			{children}
		</GridReorderHost>
	)

	if (!contextMenu) return reordered

	return (
		<GridContextMenu config={contextMenu} enabled={contextMenuEnabled} {...menu}>
			{reordered}
		</GridContextMenu>
	)
}

/** Props for {@link GridReorderHost}. @internal */
type GridReorderHostProps<T> = Pick<
	GridRegionProps<T>,
	'canReorder' | 'columnSortable' | 'rowReorderActive' | 'rowSortable' | 'children'
> & {
	/** Whether the grid takes column or row reorder at all, from its props alone. */
	configured: boolean
}

/**
 * The reorder dnd context around the table region, or the region untouched
 * when the grid takes no reorder.
 *
 * @remarks A grid that takes a reorder loads the drag and drop module as it
 * mounts. Until the module is loaded, the region renders untouched, and the
 * headers and the rows render at rest, with the layout of their draggable
 * forms. The table then mounts again one time inside the dnd context of the
 * module, with the same layout. The module stays loaded for the page, so a grid
 * that mounts after the load gets the dnd context in its first render.
 *
 * @internal
 */
function GridReorderHost<T>({ configured, children, ...props }: GridReorderHostProps<T>) {
	const kit = useGridLazyModule(reorderKit, configured)

	if (!configured || !kit) return children

	return <kit.GridReorderRegion {...props}>{children}</kit.GridReorderRegion>
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
	/** Whether the body is a window. A flat master-detail or grouped body clears the native scroll anchor after a clamp (see {@link useGridClampAnchor}). A windowed one turns the native scroll anchor off (see `k.sticky.windowed`). */
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
	// A master-detail or grouped body anchors its rows with the native scroll
	// anchor, and with the start anchor of its window when it is a window.
	const itemBody = expandable || grouped

	useGridClampAnchor(scrollRef, active && itemBody && !virtualized)

	if (!active) return children

	const fillHeight = maxHeight === 'fill'

	return (
		<div
			ref={scrollRef}
			data-slot="grid-scroll"
			className={cn(
				k.sticky.wrapper,
				itemBody && virtualized && k.sticky.windowed,
				fillHeight && k.fill.scroll,
			)}
			style={maxHeight && !fillHeight ? { maxHeight } : undefined}
		>
			{/* The wrapper scrolls the table, so the table does not scroll itself. */}
			<TableScrollsContext value={false}>{children}</TableScrollsContext>
		</div>
	)
}
