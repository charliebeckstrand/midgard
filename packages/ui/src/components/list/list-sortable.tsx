'use client'

import { DndContext, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { useCallback, useMemo, useRef } from 'react'
import { keyMatcher, useKeyedStore } from '../../hooks/use-keyed-store'
import { PortalDragOverlay } from '../../primitives/portal/portal-drag-overlay'
import { ListContext, ListItemContext } from './context'
import { type ListBaseProps, ListRoot } from './list'
import { ListItemSortable } from './list-item-sortable'
import { ListItemStatic, STATIC_CONTEXT } from './list-item-static'
import { useListDrag } from './use-list-drag'
import { useListKeyboard } from './use-list-keyboard'

/**
 * Props for {@link ListSortable}: the base list surface plus the reorder surface.
 *
 * @typeParam T - Shape of a single item.
 */
export type ListSortableProps<T> = ListBaseProps<T> & {
	/**
	 * Stable key extractor. The drag tracks each item by its key, and a keyboard
	 * move refocuses the item by its key.
	 */
	getKey: (item: T) => string
	/** Called with the next ordering. */
	onReorder: (next: T[]) => void
	/**
	 * Disable all drag / keyboard reorder interaction. The handles stay, muted.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Auto-insert a `<ListHandle>` as the first child of each `<ListItem>`. With
	 * `false`, render a `<ListHandle>` in each item.
	 * @defaultValue true
	 */
	handle?: boolean
}

/**
 * A {@link List} that the user reorders over `@dnd-kit`, by pointer drag (with a
 * drag overlay) or keyboard lift (Space then arrows). It auto-inserts a
 * {@link ListHandle} per item unless `handle` is `false`. Only this component
 * loads `@dnd-kit`.
 *
 * @remarks
 * Client component. The `getKey` result must be stable; an index key remounts
 * items mid-drag and breaks keyboard-move refocus. Each row adds one Tab stop of
 * its own, on its content area when that area activates and on the `<li>`
 * otherwise. A focusable child, such as a checkbox, keeps its own stop — see
 * {@link ListItem}. A sortable list renders every row, because a drag needs
 * every row that it can pass over.
 *
 * @typeParam T - Shape of a single item.
 */
export function ListSortable<T>({
	items,
	getKey,
	onReorder,
	variant = 'separated',
	orientation = 'vertical',
	disabled,
	handle = true,
	children,
	...props
}: ListSortableProps<T>) {
	const containerRef = useRef<HTMLUListElement>(null)

	const { itemIds, strategy, interactive, activeItem, activeIndex, dndContextProps } = useListDrag({
		items,
		getKey,
		onReorder,
		orientation,
		disabled,
		containerRef,
	})

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useListKeyboard({
		items,
		getKey,
		orientation,
		onReorder,
		containerRef,
	})

	// Each item reads its own lift from the store, so a lift renders only the item
	// that lifts and the item that drops.
	const liftedStore = useKeyedStore(liftedId, keyMatcher)

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
			liftedStore,
			itemCount: items.length,
			handle,
			onItemKeyDown,
			onItemBlur,
		}),
		[variant, interactive, disabled, liftedStore, items.length, handle, onItemKeyDown, onItemBlur],
	)

	// Memoized so an active-drag change (which only drives the overlay below) does
	// not recreate every item element and re-run their sortable wiring. Only the
	// rows are held: the consumer rest spread is a fresh object every render, so
	// keeping the `<ul>` itself in here would make the memo miss every time.
	const rows = useMemo(
		() =>
			items.map((item, index) => {
				const id = getKey(item)

				// A disabled list uses `ListItemStatic`, skipping sortable-item
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
			}),
		[items, getKey, interactive, children],
	)

	const ul = (
		<ListRoot {...props} ref={containerRef} variant={variant} orientation={orientation}>
			{rows}
		</ListRoot>
	)

	return (
		<ListContext value={contextValue}>
			{interactive ? (
				<DndContext {...dndContextProps} onDragStart={handleDragStart}>
					<SortableContext items={itemIds} strategy={strategy}>
						{ul}
					</SortableContext>
					<PortalDragOverlay>
						{activeItem != null ? (
							// The overlay is a picture of the dragged row. A `<ul>` holds its
							// `<li>`, and `inert` keeps the picture out of the focus order and
							// the accessibility tree.
							<ul inert>
								<ListItemContext
									value={{ ...STATIC_CONTEXT, id: getKey(activeItem), dragging: true }}
								>
									{children(activeItem, activeIndex)}
								</ListItemContext>
							</ul>
						) : null}
					</PortalDragOverlay>
				</DndContext>
			) : (
				ul
			)}
		</ListContext>
	)
}
