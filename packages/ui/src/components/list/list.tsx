'use client'

import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { type SortableOrientation, useSortableItem, useSortableList } from '../../hooks'
import { ListItemProvider, ListProvider } from './context'
import { k } from './variants'

const noop = () => {}

// ── List ───────────────────────────────────────────────

export type ListProps<T> = {
	/** Ordered items. */
	items: T[]
	/** Stable key extractor — required for reconciliation and DnD tracking. */
	getKey: (item: T) => string
	/** Called with the next ordering. Omit to render a non-reorderable list. */
	onReorder?: (next: T[]) => void
	/** Layout axis. Defaults to vertical. */
	orientation?: SortableOrientation
	/** Disable all drag / keyboard reorder interaction. */
	disabled?: boolean
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
	className?: string
	'aria-label'?: string
}

export function List<T>({
	items,
	getKey,
	onReorder,
	orientation = 'vertical',
	disabled,
	children,
	className,
	'aria-label': ariaLabel,
}: ListProps<T>) {
	const { itemIds, strategy, interactive, activeId, dndContextProps } = useSortableList({
		items,
		getKey,
		onReorder,
		orientation,
		disabled,
	})

	const activeItem = activeId ? items.find((item) => getKey(item) === activeId) : null

	const activeIndex = activeItem ? items.indexOf(activeItem) : -1

	return (
		<ListProvider value={{ interactive, activeId }}>
			<DndContext {...dndContextProps}>
				<SortableContext items={itemIds} strategy={strategy}>
					<ul
						aria-label={ariaLabel}
						data-slot="list"
						data-orientation={orientation}
						className={cn(k.base, orientation === 'horizontal' && k.horizontal, className)}
					>
						{items.map((item, index) => (
							<ListItemSortable key={getKey(item)} id={getKey(item)} interactive={interactive}>
								{children(item, index)}
							</ListItemSortable>
						))}
					</ul>
				</SortableContext>
				{interactive ? (
					<DragOverlay dropAnimation={null}>
						{activeItem != null ? (
							<ListItemProvider
								value={{
									id: getKey(activeItem),
									setNodeRef: noop,
									setActivatorNodeRef: noop,
									attributes: {} as never,
									listeners: undefined,
									style: {},
									isDragging: true,
								}}
							>
								{children(activeItem, activeIndex)}
							</ListItemProvider>
						) : null}
					</DragOverlay>
				) : null}
			</DndContext>
		</ListProvider>
	)
}

// ── ListItemSortable (internal) ────────────────────────
// Calls `useSortableItem` once per id and exposes its handles through context
// so `<ListItem>` and `<ListHandle>` can share a single sortable registration.

type ListItemSortableProps = {
	id: string
	interactive: boolean
	children: ReactNode
}

function ListItemSortable({ id, interactive, children }: ListItemSortableProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging } =
		useSortableItem({ id, disabled: !interactive })

	return (
		<ListItemProvider
			value={{
				id,
				setNodeRef,
				setActivatorNodeRef,
				attributes,
				listeners: interactive ? listeners : undefined,
				style: interactive ? style : {},
				isDragging,
			}}
		>
			{children}
		</ListItemProvider>
	)
}
