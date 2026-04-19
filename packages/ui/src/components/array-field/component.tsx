'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { GripVertical, Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useSortableItem, useSortableList } from '../../hooks'
import { Button } from '../button'
import { Fieldset, Legend } from '../fieldset'
import { Icon } from '../icon'

export type ArrayFieldHelpers = {
	/** Zero-based row index. */
	index: number
	/** Removes this row by invoking `onRemove`. */
	remove: () => void
}

export type ArrayFieldProps<T> = {
	/** Optional fieldset legend rendered above the rows. */
	legend?: ReactNode
	/** Ordered items. */
	items: T[]
	/** Stable key extractor. Required for DnD reconciliation. */
	getKey: (item: T) => string
	/** Called with the next ordering after a drag. Omit to disable reorder. */
	onReorder?: (next: T[]) => void
	/** Invoked when the add button is clicked. Omit to hide the button. */
	onAdd?: () => void
	/** Invoked when a row's remove button is clicked. Omit to hide the button. */
	onRemove?: (item: T, index: number) => void
	/** Minimum row count. Disables remove buttons at this count. Defaults to 0. */
	min?: number
	/** Maximum row count. Disables the add button at this count. */
	max?: number
	/** Label on the add button. */
	addLabel?: ReactNode
	/** Disable all interaction. */
	disabled?: boolean
	/** Renders each row's body — typically `<Field>` and inputs. */
	children: (item: T, helpers: ArrayFieldHelpers) => ReactNode
	className?: string
}

export function ArrayField<T>({
	legend,
	items,
	getKey,
	onReorder,
	onAdd,
	onRemove,
	min = 0,
	max,
	addLabel = 'Add',
	disabled,
	children,
	className,
}: ArrayFieldProps<T>) {
	const { itemIds, strategy, dndContextProps } = useSortableList({
		items,
		getKey,
		onReorder,
		disabled,
	})

	const atMax = max !== undefined && items.length >= max
	const atMin = items.length <= min

	return (
		<Fieldset
			data-slot="array-field"
			disabled={disabled}
			className={cn('flex flex-col gap-3', className)}
		>
			{legend && <Legend>{legend}</Legend>}
			<DndContext {...dndContextProps}>
				<SortableContext items={itemIds} strategy={strategy}>
					<div data-slot="array-field-rows" className="flex flex-col gap-2">
						{items.map((item, index) => (
							<ArrayFieldRow
								key={getKey(item)}
								id={getKey(item)}
								draggable={!!onReorder && !disabled}
								removable={!!onRemove && !atMin && !disabled}
								onRemove={() => onRemove?.(item, index)}
							>
								{children(item, { index, remove: () => onRemove?.(item, index) })}
							</ArrayFieldRow>
						))}
					</div>
				</SortableContext>
			</DndContext>
			{onAdd && (
				<Button
					data-slot="array-field-add"
					variant="outline"
					size="sm"
					className="self-start"
					disabled={disabled || atMax}
					onClick={onAdd}
				>
					<Icon icon={<Plus />} /> {addLabel}
				</Button>
			)}
		</Fieldset>
	)
}

type RowProps = {
	id: string
	draggable: boolean
	removable: boolean
	onRemove: () => void
	children: ReactNode
}

function ArrayFieldRow({ id, draggable, removable, onRemove, children }: RowProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging } =
		useSortableItem({ id, disabled: !draggable })

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-slot="array-field-row"
			data-active={isDragging || undefined}
			className={cn('flex items-start gap-2', isDragging && 'relative z-10')}
		>
			{draggable && (
				<button
					ref={setActivatorNodeRef}
					type="button"
					data-slot="array-field-handle"
					aria-label="Drag to reorder"
					className={cn(
						'mt-1.5 inline-flex size-6 flex-none items-center justify-center',
						'cursor-grab touch-none select-none active:cursor-grabbing',
						'text-zinc-400 hover:text-zinc-700',
						'dark:text-zinc-500 dark:hover:text-zinc-200',
					)}
					{...attributes}
					{...listeners}
				>
					<Icon icon={<GripVertical />} size="sm" />
				</button>
			)}
			<div data-slot="array-field-content" className="flex-1 min-w-0">
				{children}
			</div>
			{removable && (
				<Button
					data-slot="array-field-remove"
					variant="plain"
					size="sm"
					aria-label="Remove"
					onClick={onRemove}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}
