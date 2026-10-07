'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Checkbox } from '../../components/checkbox'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { SortableGrip } from '../../primitives/sortable-grip/sortable-grip'
import { k } from '../../recipes/kata/grid'
import { rowName } from './engine/grid-row/cell'
import { GridRowActions } from './grid-row-actions'
import type { GridColumn } from './types'

/**
 * The dnd-kit sortable bindings a {@link GridReorderableRow} threads into its
 * row. They are the `<tr>` node ref and lifted transform/transition style, plus
 * the activator ref, attributes, and listeners the drag-handle grip carries.
 *
 * @internal
 */
export type GridRowSortable = {
	setNodeRef: (node: HTMLElement | null) => void
	setActivatorNodeRef: (node: HTMLElement | null) => void
	attributes: DraggableAttributes
	listeners: DraggableSyntheticListeners
	style: CSSProperties
	dragging: boolean
}

/** Props for {@link GridRowDragHandle}. @internal */
type GridRowDragHandleProps = {
	/** The row's sortable bindings when reordering is live; `undefined` renders an inert grip. */
	sortable: GridRowSortable | undefined
	rowLabel: string | undefined
	rowKey: string | number
}

/**
 * The grip in a {@link GridColumn.dragHandle} cell. When the row is reorderable
 * it carries the sortable's activator ref, attributes, and pointer/keyboard
 * listeners. Otherwise it renders disabled: present for layout, inert because a
 * manual order isn't meaningful right now (a column sort, a filtered view, …).
 *
 * @internal
 */
function GridRowDragHandle({ sortable, rowLabel, rowKey }: GridRowDragHandleProps) {
	const label = `Reorder ${rowName(rowLabel, rowKey)}`

	if (!sortable) {
		return (
			<button
				type="button"
				disabled
				aria-label={label}
				className={cn(k.row.reorder.handle.disabled)}
			>
				<Icon icon={<GripVertical />} />
			</button>
		)
	}

	return (
		<SortableGrip sortable={sortable} label={label} className={cn(k.row.reorder.handle.base)} />
	)
}

/**
 * The content of a special cell of a row: the drag grip, the selection
 * checkbox, or the row actions. The flat row and the grouped leaf row share it.
 * A leaf row gives no `sortable`, so its grip is inert. Any other column gives
 * `null`.
 *
 * @internal
 */
export function GridRowSpecialCell<T>({
	col,
	row,
	rowKey,
	selected,
	toggleRow,
	rowLabel,
	sortable,
}: {
	col: GridColumn<T>
	row: T
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	rowLabel: string | undefined
	/** The row's sortable bindings while row reorder is live. */
	sortable?: GridRowSortable
}): ReactNode {
	if (col.dragHandle) {
		return <GridRowDragHandle sortable={sortable} rowLabel={rowLabel} rowKey={rowKey} />
	}

	if (col.selectable) {
		return (
			<Checkbox
				checked={selected}
				onChange={() => toggleRow(rowKey)}
				aria-label={`Select ${rowName(rowLabel, rowKey)}`}
			/>
		)
	}

	if (col.actions) return <GridRowActions render={col.actions} row={row} rowKey={rowKey} />

	return null
}
