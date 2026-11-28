'use client'

import type { DragControls } from 'motion/react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { createContext } from '../../core/create-context'
import type { ReorderMove } from '../../hooks/use-keyboard-reorder'
import type { ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types/orientation'
import type { KeyedStore } from '../../utilities/keyed-store'
import type { ListReorderParts } from './list-reorder'

/** List-wide state shared with items: variant, interactivity/disabled flags, the keyboard-lift store, item count, the handle flag, and item event handlers. */
export type ListContextValue = {
	/** Visual variant; see `List.variant` for semantics. */
	variant: ListVariant
	/** Layout axis, which names the moves of the move menu. */
	orientation: Orientation
	/** Whether the list allows drag / keyboard reorder. */
	interactive: boolean
	/** Whether a reorderable list (one with `onReorder`) is disabled. A read-only list is never disabled. */
	disabled: boolean
	/**
	 * Whether each item id is "lifted" via keyboard (Space). An item reads its own
	 * id with `useKeyedValue`.
	 *
	 * @remarks
	 * It replaces `liftedId`. A lifted id in the context gave the context a new
	 * value for each lift, and each item rendered. The store keeps its identity,
	 * and an item that subscribes to its own id renders only when its own lift
	 * changes.
	 */
	liftedStore: KeyedStore<string, boolean>
	/** Number of items in the list. */
	itemCount: number
	/** Whether `<ListItem>` must auto-insert a `<ListHandle>`. Only a list with `onReorder` does. */
	handle: boolean
	/** Keyboard handler for list items: Space lifts, arrows move / navigate. It keeps its identity. */
	onItemKeyDown: (id: string, event: KeyboardEvent) => void
	/** Blur handler that drops any active keyboard lift. */
	onItemBlur: () => void
	/** The moves of the move menu of an item. Call it from an event, such as the open of the menu. It keeps its identity. */
	menuMoves: (id: string) => ReorderMove[]
	/**
	 * Moves an item from its move menu, and announces the move with `name`, the
	 * name that the menu read when it opened. It keeps its identity.
	 */
	menuMove: (id: string, move: ReorderMove, name: string) => void
	/**
	 * The `Reorder` parts of a reorderable list after their module arrives. Until
	 * then, and in a read-only list, it is absent, and a row is a plain `<li>`.
	 */
	reorderParts?: ListReorderParts
}

/**
 * Item-facing list cascade. Provided by `<List>`; read by descendant items.
 *
 * @returns The enclosing {@link ListContextValue}.
 * @throws When no `<List>` is mounted above the caller.
 */
export const [ListContext, useListContext] = createContext<ListContextValue>('List')

/** Per-item drag bindings shared with an item and its handle: the item `id`, the row ref, the reorder bindings, and the `dragging` flag. */
export type ListItemContextValue = {
	id: string
	/** Ref for the `<li>` element. */
	setNodeRef: (node: HTMLElement | null) => void
	/**
	 * The Motion `Reorder.Item` bindings of a row in a reorderable list. The handle
	 * starts the drag through `controls`. Absent in a read-only list.
	 */
	reorder?: {
		controls: DragControls
		/** Whether the row moves to its new place with no animation, for reduced motion. */
		instant: boolean
		onDragStart: () => void
		/** Takes the end event of Motion, because a `pointercancel` ends the drag with no drop. */
		onDragEnd: (event: Event) => void
	}
	/** Whether this item is currently being dragged. */
	dragging: boolean
	/** The id of the hidden reorder instructions that each row names. */
	describedBy?: string
	/**
	 * The DOM id of the content area of a reorderable row. The move menu takes
	 * its name from the content area, not from the row, because the row also
	 * holds the names of its other controls.
	 */
	contentId?: string
	/**
	 * The place of the row in a windowed list. The row writes it as `data-index`,
	 * which the window measures by, and as `aria-posinset` and `aria-setsize`,
	 * because the rows outside the window are not in the DOM to count.
	 */
	position?: { index: number; count: number }
}

/**
 * Drag-state cascade for one row. Provided by `<ListItem>`; read by its handle.
 *
 * @returns The enclosing {@link ListItemContextValue}.
 * @throws When no `<ListItem>` is mounted above the caller.
 */
export const [ListItemContext, useListItemContext] = createContext<ListItemContextValue>('ListItem')

/** A line of a row that the truncation reveal of the row can show. @internal */
export type ListRevealLine = 'label' | 'description'

/**
 * The truncation reveal of one row. A {@link ListLabel} or a
 * {@link ListDescription} reports its content while it truncates, and the row
 * shows each reported line in its tooltip. @internal
 */
export type ListItemRevealValue = {
	/** The `<li>`, the trigger of the tooltip. Its pointer or focus contact arms the measure of each line. */
	armRef: RefObject<HTMLElement | null>
	/** Reports the content of a line that truncates, or `null` when the line fits. It keeps its identity. */
	report: (line: ListRevealLine, content: ReactNode) => void
}

/**
 * The truncation reveal of the nearest `<ListItem>`, or `null` outside one. A
 * label or a description outside a row shows no reveal. @internal
 */
export const [ListItemRevealContext, useListItemReveal] = createContext<ListItemRevealValue | null>(
	'ListItemReveal',
	{ default: null },
)
