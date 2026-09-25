'use client'

import { DndContext, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ComponentProps, type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useLiftedStore } from '../../hooks/use-lifted-store'
import { k, type ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types'
import { ListContext, ListItemContext } from './context'
import { ListItemSortable } from './list-item-sortable'
import { ListItemStatic, STATIC_CONTEXT } from './list-item-static'
import { useListDrag } from './use-list-drag'
import { useListKeyboard } from './use-list-keyboard'

type BaseListProps<T> = Omit<ComponentProps<'ul'>, 'className' | 'children'> & {
	/** Ordered items. */
	items: T[]
	/** Visual variant. `separated` spaces cards apart; `outline` draws one border around the whole list with dividers; `plain` uses dividers only; `solid` renders tinted cards. @defaultValue 'separated' */
	variant?: ListVariant
	/** Layout axis. @defaultValue 'vertical' */
	orientation?: Orientation
	/** Disable all drag / keyboard reorder interaction. */
	disabled?: boolean
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
	className?: string
	'aria-label'?: string
}

/**
 * Props for {@link List}: the base list surface plus the reorder surface.
 *
 * @typeParam T - Shape of a single item.
 * @see {@link List} for the `getKey` requirement on a reorderable list.
 */
export type ListProps<T> = BaseListProps<T> &
	(
		| {
				/** Auto-insert a `<ListHandle>` as the first child of each `<ListItem>`. */
				sortable?: true
				/** Stable key extractor; required for DnD tracking. */
				getKey: (item: T) => string
				/** Called with the next ordering. Omit to render a non-reorderable list. */
				onReorder?: (next: T[]) => void
		  }
		| {
				sortable: false
				/** Stable key extractor; required for DnD tracking. */
				getKey: (item: T) => string
				/** Called with the next ordering; the consumer renders its own `<ListHandle>`. */
				onReorder: (next: T[]) => void
		  }
		| {
				sortable: false
				/** Stable key extractor. Optional when the list is read-only; falls back to item index. */
				getKey?: (item: T) => string
				onReorder?: undefined
		  }
	)

/**
 * Renders an ordered `items` source as a `<ul>` through a `children` render
 * function, in one of four `variant`s and either orientation. With `onReorder`
 * it becomes reorderable over `@dnd-kit`, by pointer drag (with a drag overlay)
 * or keyboard lift (Space then arrows). It auto-inserts a {@link ListHandle}
 * per item unless `sortable: false`. Read-only lists skip per-item sortable
 * registration entirely. Compose {@link ListItem} (with {@link ListLabel} /
 * {@link ListDescription}) in the render function.
 *
 * @remarks
 * Client component. Reorderable lists require a stable `getKey`; the index
 * fallback remounts items mid-drag and breaks keyboard-move refocus. Each
 * reorderable row adds one Tab stop of its own, on its content area when that
 * area activates and on the `<li>` otherwise. A focusable child, such as a
 * checkbox, keeps its own stop — see {@link ListItem}.
 *
 * @typeParam T - Shape of a single item.
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
	...props
}: ListProps<T>) {
	const {
		effectiveGetKey,
		itemIds,
		strategy,
		interactive,
		activeItem,
		activeIndex,
		dndContextProps,
	} = useListDrag({ items, getKey, onReorder, orientation, disabled })

	const containerRef = useRef<HTMLUListElement>(null)

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useListKeyboard({
		items,
		getKey: effectiveGetKey,
		orientation,
		onReorder,
		containerRef,
	})

	// Each item reads its own lift from the store, so a lift renders only the item
	// that lifts and the item that drops.
	const liftedStore = useLiftedStore(liftedId)

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
			sortable,
			onItemKeyDown,
			onItemBlur,
		}),
		[
			variant,
			interactive,
			disabled,
			liftedStore,
			items.length,
			sortable,
			onItemKeyDown,
			onItemBlur,
		],
	)

	// Memoized so an active-drag change (which only drives the overlay below) does
	// not recreate every item element and re-run their sortable wiring. Only the
	// rows are held: the consumer rest spread is a fresh object every render, so
	// keeping the `<ul>` itself in here would make the memo miss every time.
	const rows = useMemo(
		() =>
			items.map((item, index) => {
				const id = effectiveGetKey(item, index)

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
			}),
		[items, effectiveGetKey, interactive, children],
	)

	const ul = (
		<ul
			{...props}
			ref={containerRef}
			aria-label={ariaLabel}
			data-slot="list"
			data-orientation={orientation}
			className={cn(k.root({ variant, orientation }), className)}
		>
			{rows}
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
								value={{ ...STATIC_CONTEXT, id: effectiveGetKey(activeItem), dragging: true }}
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
