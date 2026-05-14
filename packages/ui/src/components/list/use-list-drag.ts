'use client'

import { useMemo } from 'react'
import { type Orientation, useSortableList } from '../../hooks'

type Options<T> = {
	items: T[]
	getKey?: (item: T) => string
	onReorder?: (next: T[]) => void
	orientation: Orientation
	disabled?: boolean
}

/**
 * DnD orchestration for `<List>`: derives a stable key extractor (falling back
 * to item index for read-only lists), wraps `useSortableList`, and resolves
 * the active item being dragged. Pairs with `useListKeyboard` — mirrors
 * `useKanbanDrag`.
 */
export function useListDrag<T>({ items, getKey, onReorder, orientation, disabled }: Options<T>) {
	const effectiveGetKey = useMemo<(item: T) => string>(() => {
		if (getKey) return getKey

		const indexByItem = new Map<T, number>()

		items.forEach((item, index) => {
			indexByItem.set(item, index)
		})

		return (item: T) => String(indexByItem.get(item) ?? -1)
	}, [getKey, items])

	const { itemIds, strategy, interactive, activeId, dndContextProps } = useSortableList({
		items,
		getKey: effectiveGetKey,
		onReorder,
		orientation,
		disabled,
		keyboardSensor: false,
	})

	const activeItem = activeId
		? (items.find((item) => effectiveGetKey(item) === activeId) ?? null)
		: null

	const activeIndex = activeItem ? items.indexOf(activeItem) : -1

	return {
		effectiveGetKey,
		itemIds,
		strategy,
		interactive,
		activeId,
		activeItem,
		activeIndex,
		dndContextProps,
	}
}
