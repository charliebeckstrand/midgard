'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type ComponentProps, type ReactNode, useId } from 'react'
import { createContext } from '../../core'
import { useMotionSafeSortable } from '../../hooks/use-motion-safe-sortable'
import {
	restrictToHorizontalAxis,
	restrictToVerticalAxis,
	type SortableListOptions,
	useSortableList,
} from '../../hooks/use-sortable-list'
import { restrictToFirstScrollableAncestor } from './engine/grid-reorder-compute'
import {
	type GridReorderableColumnHeaderProps,
	GridReorderableColumnHeaderView,
} from './grid-column-header'
import { GridReorderContext, GridReorderKitContext } from './grid-reorder'
import { GridRowImpl, type GridRowProps } from './grid-row'
import type { GridRowSortable } from './grid-row-special-cell'
import type { GridColumn } from './types'
import type { GridRowItem } from './use-grid-row-reorder'

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

/** The items and the strategy of the row sortable, for {@link RowSortableScope}. @internal */
type RowSortableValue = {
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
}

/** The row sortable of the nearest {@link GridReorderRegion}. @internal */
const [RowSortableContext, useRowSortable] = createContext<RowSortableValue>('GridRowSortable')

/** Props for {@link GridReorderRegion}. @internal */
type GridReorderRegionProps<T> = {
	/** Whether column reorder is live now. */
	canReorder: boolean
	/** The options of the column sortable. */
	columnSortable: SortableListOptions<GridColumn<T>>
	/** Whether row reorder is live now. It stands column reorder down. */
	rowReorderActive: boolean
	/** The options of the row sortable. */
	rowSortable: SortableListOptions<GridRowItem<T>>
	children: ReactNode
}

/**
 * The reorder dnd context around the table region of a grid that takes column
 * or row reorder.
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
export function GridReorderRegion<T>({
	canReorder,
	columnSortable,
	rowReorderActive,
	rowSortable,
	children,
}: GridReorderRegionProps<T>) {
	const columns = useSortableList(columnSortable)

	const rows = useSortableList(rowSortable)

	// One id for both modes. The id of each mode's props would change the id of
	// the drag description each time the mode changes.
	const dndId = useId()

	const mode = rowReorderActive ? 'row' : canReorder ? 'column' : null

	const contextProps = mode === 'row' ? rows.dndContextProps : columns.dndContextProps

	return (
		<DndContext
			{...contextProps}
			id={dndId}
			sensors={contextProps.sensors}
			modifiers={mode === 'row' ? ROW_REORDER_MODIFIERS : REORDER_MODIFIERS}
			autoScroll={mode === 'row' ? ROW_REORDER_AUTO_SCROLL : REORDER_AUTO_SCROLL}
		>
			<SortableContext
				items={mode === 'column' ? columns.itemIds : NO_ITEMS}
				strategy={columns.strategy}
			>
				<GridReorderContext value={mode === 'column' ? columns.activeId : null}>
					<RowSortableContext value={rows}>
						<GridReorderKitContext value={gridReorderKit}>{children}</GridReorderKitContext>
					</RowSortableContext>
				</GridReorderContext>
			</SortableContext>
		</DndContext>
	)
}

/**
 * The row sortable around the body rows, from the nearest
 * {@link GridReorderRegion}. A DOM-less fragment, so it nests inside `<tbody>`.
 *
 * @internal
 */
function RowSortableScope({ children }: { children: ReactNode }) {
	const { itemIds, strategy } = useRowSortable()

	return (
		<SortableContext items={itemIds} strategy={strategy}>
			{children}
		</SortableContext>
	)
}

/**
 * A reorderable column header that registers the `<th>` as a horizontal
 * sortable item.
 *
 * @internal
 */
function SortableColumnHeader(props: GridReorderableColumnHeaderProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		isDragging,
		isSorting,
	} = useSortable({ id: String(props.column.id) })

	return (
		<GridReorderableColumnHeaderView
			{...props}
			sortable={{
				setNodeRef,
				setActivatorNodeRef,
				attributes,
				listeners,
				x: transform?.x ?? 0,
				isDragging,
				isSorting,
			}}
		/>
	)
}

/**
 * A drag-reorderable body row. It registers the `<tr>` as a vertical dnd-kit
 * sortable keyed by its row key, and composes the lift transform/transition. It
 * threads the activator ref and listeners down to its drag-handle grip. Unlike
 * {@link useSortableItem}, the dragged row stays visible (no `<DragOverlay>`) and
 * lifts in place via {@link k.row.reorder.dragging}.
 *
 * @internal
 */
function SortableRow<T>(props: GridRowProps<T>) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useMotionSafeSortable({ id: String(props.rowKey) })

	const sortable: GridRowSortable = {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		style: { transform: CSS.Transform.toString(transform), transition },
		dragging: isDragging,
	}

	return <GridRowImpl<T> {...props} sortable={sortable} />
}

/**
 * The drag and drop parts of the grid. The region provides them to the table
 * through {@link GridReorderKitContext}.
 *
 * @internal
 */
export const gridReorderKit = { RowSortableScope, SortableColumnHeader, SortableRow }

/** The drag and drop parts of the grid. @internal */
export type GridReorderKit = typeof gridReorderKit
