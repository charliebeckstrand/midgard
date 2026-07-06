'use client'

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { Rows3, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn, createContext, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { columnLabel, type GridColumn } from './types'

/** Droppable id of the group panel's drop target. @internal */
const GROUP_BY_DROP_ID = 'grid-group-by-panel'

/**
 * Prefix on a group-by drag id, distinguishing a header's group affordance from
 * any other draggable the grid hosts.
 *
 * @internal
 */
const GROUP_BY_DRAG_PREFIX = 'groupby:'

/**
 * The group-panel wiring {@link GridGroupByHandle} and {@link GridGroupByPanel}
 * read: the active grouped column id, the binding write-back, and the gates.
 * `null` (the default) means the panel is off, so neither renders anything.
 *
 * @internal
 */
export type GridGroupByContextValue = {
	/** The active grouped column id, or `null` when ungrouped. */
	grouping: (string | number) | null
	/** Writes the grouped column id (or `null` to ungroup) through the `groupBy` binding. */
	setGrouping: (next: (string | number) | null) => void
	/** Whether the header affordances are live — false on an empty/loading grid, like the other header chrome. */
	enabled: boolean
	/**
	 * Disables the pointer drag (the press-to-group click stays live) while a
	 * column or row reorder owns the surrounding dnd context — a nested
	 * `useDraggable` would register against that context and never reach the
	 * panel's drop target.
	 */
	dragDisabled: boolean
}

/** Carries the group-panel wiring from `GridData` to the header handles and the panel. @internal */
export const [GridGroupByContext, useGridGroupByPanel] =
	createContext<GridGroupByContextValue | null>('GridGroupByPanel', { default: null })

/**
 * A groupable column's header affordance: press it to group the rows by the
 * column, or drag it into the {@link GridGroupByPanel} drop target — one
 * control, so the pointer gesture and the keyboard/screen-reader path share a
 * label. Renders nothing while the panel is off, on a non-`groupable` column,
 * on an empty grid, or once its column is the active group (the panel's chip
 * then owns the state).
 *
 * @internal
 */
export function GridGroupByHandle({
	column,
}: {
	column: Pick<GridColumn<unknown>, 'id' | 'title' | 'groupable'>
}) {
	const context = useGridGroupByPanel()

	const active = Boolean(context?.enabled && column.groupable)

	const { setNodeRef, attributes, listeners } = useDraggable({
		id: `${GROUP_BY_DRAG_PREFIX}${column.id}`,
		disabled: !active || context?.dragDisabled !== false,
	})

	if (!context || !active || column.id === context.grouping) return null

	return (
		<Button
			variant="bare"
			ref={setNodeRef}
			aria-label={`Group rows by ${columnLabel(column)}`}
			className={cn(k.groupPanel.handle)}
			{...attributes}
			{...listeners}
			onClick={() => context.setGrouping(column.id)}
		>
			<Icon icon={<Rows3 />} />
		</Button>
	)
}

/**
 * The group panel between the toolbar and the table: the drop target a
 * {@link GridGroupByHandle} drags into, showing the active group as a chip with
 * a remove button (which ungroups), or a drag hint while ungrouped.
 * Single-level, so the panel holds one chip and a second drop replaces it.
 * Renders nothing while the panel is off.
 *
 * @internal
 */
export function GridGroupByPanel<T>({ columns }: { columns: GridColumn<T>[] }) {
	const context = useGridGroupByPanel()

	const { setNodeRef, isOver } = useDroppable({ id: GROUP_BY_DROP_ID })

	if (!context) return null

	const grouped =
		context.grouping != null ? columns.find((col) => col.id === context.grouping) : undefined

	const label = grouped ? columnLabel(grouped) : null

	return (
		<div
			ref={setNodeRef}
			data-slot="grid-group-panel"
			data-over={dataAttr(isOver)}
			className={cn(k.groupPanel.root)}
		>
			{grouped && label != null ? (
				<Badge size="sm">
					{label}
					<Button
						variant="bare"
						size="sm"
						aria-label={`Ungroup ${label}`}
						onClick={() => context.setGrouping(null)}
					>
						<Icon icon={<X />} />
					</Button>
				</Badge>
			) : (
				<span className={cn(k.groupPanel.hint)}>Drag a column here to group its rows</span>
			)}
		</div>
	)
}

/** The column id carried by a {@link GROUP_BY_DRAG_PREFIX}-prefixed drag id, resolved back to its column. @internal */
function draggedColumn<T>(
	columns: GridColumn<T>[],
	dragId: string | null,
): GridColumn<T> | undefined {
	if (dragId == null || !dragId.startsWith(GROUP_BY_DRAG_PREFIX)) return undefined

	const id = dragId.slice(GROUP_BY_DRAG_PREFIX.length)

	return columns.find((col) => String(col.id) === id)
}

/** Props for {@link GridGroupByDndRegion}. @internal */
type GridGroupByDndRegionProps<T> = {
	/** Whether the panel is on; the region renders its children untouched otherwise. */
	active: boolean
	/** The full column set, resolved for the drag overlay's label and the drop commit. */
	columns: GridColumn<T>[]
	/** Writes the dropped column id through the `groupBy` binding. */
	setGrouping: (next: (string | number) | null) => void
	children: ReactNode
}

/**
 * Wraps the group panel and the table region in the group-by drag context, so a
 * header's {@link GridGroupByHandle} can be dragged onto the
 * {@link GridGroupByPanel} drop target. A drag lifts a chip clone of the column
 * label in a `DragOverlay` (the tiny handle itself stays put), and a drop over
 * the panel commits the column through the binding. A press without movement
 * falls through to the handle's click (the pointer sensor requires a small
 * travel), which groups directly — the keyboard path.
 *
 * @internal
 */
export function GridGroupByDndRegion<T>({
	active,
	columns,
	setGrouping,
	children,
}: GridGroupByDndRegionProps<T>) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

	const [dragId, setDragId] = useState<string | null>(null)

	if (!active) return children

	const activeColumn = draggedColumn(columns, dragId)

	const handleDragEnd = (event: DragEndEvent) => {
		const column = draggedColumn(columns, String(event.active.id))

		if (column && event.over?.id === GROUP_BY_DROP_ID) setGrouping(column.id)

		setDragId(null)
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={(event) => setDragId(String(event.active.id))}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setDragId(null)}
		>
			{children}
			<DragOverlay>
				{activeColumn ? (
					<span className={cn(k.groupPanel.overlay)}>{columnLabel(activeColumn)}</span>
				) : null}
			</DragOverlay>
		</DndContext>
	)
}
