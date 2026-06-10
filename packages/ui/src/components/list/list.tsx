'use client'

import {
	DndContext,
	type DraggableAttributes,
	DragOverlay,
	type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k, type ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types'
import { noop } from '../../utilities'
import { ListContext, ListItemContext } from './context'
import { ListItemSortable } from './list-item-sortable'
import { ListItemStatic } from './list-item-static'
import { useListDrag } from './use-list-drag'
import { useListKeyboard } from './use-list-keyboard'

type BaseListProps<T> = {
	/** Ordered items. */
	items: T[]
	/** Called with the next ordering. Omit to render a non-reorderable list. */
	onReorder?: (next: T[]) => void
	/** Visual variant. `separated` spaces cards apart; `outline` draws one border around the whole list with dividers; `plain` uses dividers only; `solid` renders tinted cards. */
	variant?: ListVariant
	/** Layout axis. Defaults to vertical. */
	orientation?: Orientation
	/** Disable all drag / keyboard reorder interaction. */
	disabled?: boolean
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
	className?: string
	'aria-label'?: string
}

export type ListProps<T> = BaseListProps<T> &
	(
		| {
				/** Auto-insert a `<ListHandle>` as the first child of each `<ListItem>`. */
				sortable?: true
				/** Stable key extractor; required for DnD tracking. */
				getKey: (item: T) => string
		  }
		| {
				sortable: false
				/** Stable key extractor. Optional when the list is read-only; falls back to item index. */
				getKey?: (item: T) => string
		  }
	)

/**
 * Renders an ordered `items` source through a `children` render function,
 * with optional drag-and-drop and keyboard reordering when `onReorder` is
 * supplied. Read-only lists skip per-item sortable registration entirely.
 */
export function List<T>({
	items,
	getKey,
	onReorder,
	variant = 'separated',
	orientation = 'vertical',
	disabled,
	sortable = true,
	children,
	className,
	'aria-label': ariaLabel,
}: ListProps<T>) {
	const {
		effectiveGetKey,
		itemIds,
		strategy,
		interactive,
		activeId,
		activeItem,
		activeIndex,
		dndContextProps,
	} = useListDrag({ items, getKey, onReorder, orientation, disabled })

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useListKeyboard({
		items,
		getKey: effectiveGetKey,
		orientation,
		onReorder,
	})

	// Clear keyboard-lifted state when a pointer drag begins.
	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			setLiftedId(null)
			dndContextProps.onDragStart(event)
		},
		[dndContextProps, setLiftedId],
	)

	const contextValue = useMemo(
		() => ({
			variant,
			interactive,
			disabled: !!disabled,
			activeId,
			liftedId,
			itemCount: items.length,
			sortable,
			onItemKeyDown,
			onItemBlur,
		}),
		[
			variant,
			interactive,
			disabled,
			activeId,
			liftedId,
			items.length,
			sortable,
			onItemKeyDown,
			onItemBlur,
		],
	)

	const ul = (
		<ul
			aria-label={ariaLabel}
			data-slot="list"
			data-orientation={orientation}
			className={cn(k.root({ variant, orientation }), className)}
		>
			{items.map((item, index) => {
				const id = effectiveGetKey(item)

				// Read-only lists use `ListItemStatic`, skipping sortable-item
				// registration. `useSortableItem` does non-trivial per-item work
				// (ref wiring, dnd context reads) even when `disabled: true`.
				return interactive ? (
					<ListItemSortable key={id} id={id}>
						{children(item, index)}
					</ListItemSortable>
				) : (
					<ListItemStatic key={id} id={id}>
						{children(item, index)}
					</ListItemStatic>
				)
			})}
		</ul>
	)

	return (
		<ListContext value={contextValue}>
			{interactive ? (
				<DndContext {...dndContextProps} onDragStart={handleDragStart}>
					<SortableContext items={itemIds} strategy={strategy}>
						{ul}
					</SortableContext>
					<DragOverlay dropAnimation={null}>
						{activeItem != null ? (
							<ListItemContext
								value={{
									id: effectiveGetKey(activeItem),
									setNodeRef: noop,
									setActivatorNodeRef: noop,
									attributes: {} as DraggableAttributes,
									listeners: undefined,
									style: {},
									dragging: true,
								}}
							>
								{children(activeItem, activeIndex)}
							</ListItemContext>
						) : null}
					</DragOverlay>
				</DndContext>
			) : (
				ul
			)}
		</ListContext>
	)
}
