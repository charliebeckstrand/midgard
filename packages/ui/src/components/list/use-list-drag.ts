'use client'

import { useMemo } from 'react'
import { useSortableList } from '../../hooks'
import type { Orientation } from '../../types'

type Options<T> = {
	items: T[]
	getKey?: (item: T) => string
	onReorder?: (next: T[]) => void
	orientation: Orientation
	disabled?: boolean
}

/**
 * DnD orchestration for `<List>`. It derives a stable key extractor, wraps
 * `useSortableList`, and resolves the active item being dragged. A read-only
 * list falls back to the render position for that key. Pairs with `useListKeyboard`; mirrors
 * `useKanbanDrag`.
 */
export function useListDrag<T>({ items, getKey, onReorder, orientation, disabled }: Options<T>) {
	// The fallback reads the position, not the item, so duplicate primitives get
	// distinct keys. Only the read-only arm reaches it. There, no drag or keyboard
	// lookup calls the extractor without the index.
	const effectiveGetKey = useMemo<(item: T, index?: number) => string>(
		() => getKey ?? ((_item, index) => String(index)),
		[getKey],
	)

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
