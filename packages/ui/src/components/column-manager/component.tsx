'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { GripVertical, Pin } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useSortableItem, useSortableList } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { k } from './variants'

export type ColumnManagerItem = {
	id: string | number
	title: ReactNode
	/** Pinned columns cannot be reordered or hidden. */
	pinned?: boolean
	/** When false, the column cannot be hidden. Defaults to true. */
	hideable?: boolean
}

export type ColumnManagerPreset = {
	order: (string | number)[]
	hidden: (string | number)[]
}

export type ColumnManagerProps = {
	columns: ColumnManagerItem[]

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	onSavePreset?: (preset: ColumnManagerPreset) => void
	savePresetLabel?: ReactNode

	className?: string
}

export function ColumnManager({
	columns,
	order: orderProp,
	defaultOrder,
	onOrderChange,
	hidden: hiddenProp,
	defaultHidden,
	onHiddenChange,
	onSavePreset,
	savePresetLabel = 'Save as preset',
	className,
}: ColumnManagerProps) {
	const fallbackOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [order = fallbackOrder, setOrder] = useControllable<(string | number)[]>({
		value: orderProp,
		defaultValue: defaultOrder ?? fallbackOrder,
		onChange: (next) => onOrderChange?.(next ?? []),
	})

	const [hidden = defaultHidden ?? new Set<string | number>(), setHidden] = useControllable<
		Set<string | number>
	>({
		value: hiddenProp,
		defaultValue: defaultHidden ?? new Set<string | number>(),
		onChange: (next) => onHiddenChange?.(next ?? new Set<string | number>()),
	})

	const byId = useMemo(() => {
		const map = new Map<string | number, ColumnManagerItem>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

	const pinnedColumns = useMemo(() => columns.filter((c) => c.pinned), [columns])

	const orderableColumns = useMemo(
		() => order.map((id) => byId.get(id)).filter((c): c is ColumnManagerItem => !!c && !c.pinned),
		[order, byId],
	)

	const toggle = useCallback(
		(id: string | number) => {
			const next = new Set(hidden)

			if (next.has(id)) next.delete(id)
			else next.add(id)

			setHidden(next)
		},
		[hidden, setHidden],
	)

	const getKey = useCallback((item: ColumnManagerItem) => String(item.id), [])

	const handleReorder = useCallback(
		(items: ColumnManagerItem[]) => {
			const reorderedIds = items.map((i) => i.id)

			const next: (string | number)[] = []

			let idx = 0

			for (const id of order) {
				const col = byId.get(id)

				if (!col) continue

				if (col.pinned) {
					next.push(id)
				} else {
					next.push(reorderedIds[idx] as string | number)

					idx++
				}
			}

			setOrder(next)
		},
		[order, byId, setOrder],
	)

	const { itemIds, strategy, dndContextProps } = useSortableList({
		items: orderableColumns,
		getKey,
		onReorder: handleReorder,
	})

	const handleSavePreset = useCallback(() => {
		onSavePreset?.({ order, hidden: Array.from(hidden) })
	}, [onSavePreset, order, hidden])

	return (
		<div data-slot="column-manager" className={cn(k.root, className)}>
			<div className={cn(k.list)}>
				{pinnedColumns.map((col) => (
					<div key={col.id} data-slot="column-manager-item" data-pinned="" className={cn(k.item)}>
						<span aria-hidden="true" className={cn(k.handle)}>
							<Icon icon={<Pin />} className={cn(k.handleIcon)} />
						</span>
						<Checkbox checked disabled aria-label={`${titleText(col.title, col.id)} (pinned)`} />
						<span className={cn(k.title)}>{col.title}</span>
					</div>
				))}
				<DndContext {...dndContextProps}>
					<SortableContext items={itemIds} strategy={strategy}>
						{orderableColumns.map((col) => (
							<ColumnManagerRow
								key={col.id}
								column={col}
								checked={!hidden.has(col.id)}
								onToggle={() => toggle(col.id)}
							/>
						))}
					</SortableContext>
				</DndContext>
			</div>
			{onSavePreset && (
				<div className={cn(k.footer)}>
					<Button variant="soft" size="sm" onClick={handleSavePreset}>
						{savePresetLabel}
					</Button>
				</div>
			)}
		</div>
	)
}

function titleText(title: ReactNode, id: string | number): string {
	return typeof title === 'string' ? title : String(id)
}

type ColumnManagerRowProps = {
	column: ColumnManagerItem
	checked: boolean
	onToggle: () => void
}

function ColumnManagerRow({ column, checked, onToggle }: ColumnManagerRowProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging } =
		useSortableItem({ id: String(column.id) })

	const hideable = column.hideable !== false

	const label = titleText(column.title, column.id)

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-slot="column-manager-item"
			data-dragging={isDragging || undefined}
			className={cn(k.item)}
		>
			<button
				type="button"
				ref={setActivatorNodeRef}
				aria-label={`Drag ${label} to reorder`}
				className={cn(k.handle)}
				{...attributes}
				{...listeners}
			>
				<Icon icon={<GripVertical />} className={cn(k.handleIcon)} />
			</button>
			<Checkbox
				checked={checked}
				disabled={!hideable}
				onChange={onToggle}
				aria-label={`Show ${label}`}
			/>
			<span className={cn(k.title)}>{column.title}</span>
		</div>
	)
}
