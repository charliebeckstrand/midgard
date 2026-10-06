'use client'

import { type RefObject, useMemo } from 'react'
import { useSortableList } from '../../hooks'
import { LIFT_INSTRUCTIONS } from '../../hooks/use-keyboard-lifted'
import type { Orientation } from '../../types'
import { listItemName } from './use-list-keyboard'

type Options<T> = {
	items: T[]
	getKey?: (item: T) => string
	onReorder?: (next: T[]) => void
	orientation: Orientation
	disabled?: boolean
	/** List root. The announcements read the names of the items in it. */
	containerRef: RefObject<HTMLElement | null>
}

/**
 * DnD orchestration for `<List>`. It derives a stable key extractor, wraps
 * `useSortableList`, and resolves the active item being dragged. A read-only
 * list falls back to the render position for that key. The announcements name each item, and
 * the instructions give the keys of the lift model. Pairs with `useListKeyboard`; mirrors
 * `useKanbanDrag`.
 */
export function useListDrag<T>({
	items,
	getKey,
	onReorder,
	orientation,
	disabled,
	containerRef,
}: Options<T>) {
	// The fallback reads the position, not the item, so duplicate primitives get
	// distinct keys. Only the read-only arm reaches it. There, no drag or keyboard
	// lookup calls the extractor without the index.
	const effectiveGetKey = useMemo<(item: T, index?: number) => string>(
		() => getKey ?? ((_item, index) => String(index)),
		[getKey],
	)

	const sortable = useSortableList({
		items,
		getKey: effectiveGetKey,
		onReorder,
		orientation,
		disabled,
		keyboardSensor: false,
		describe: (item) => listItemName(containerRef.current, effectiveGetKey(item)),
	})

	const { itemIds, strategy, interactive, activeId } = sortable

	// `useListKeyboard` owns the keys, not the dnd-kit keyboard sensor.
	const dndContextProps = useMemo(
		() => ({
			...sortable.dndContextProps,
			accessibility: {
				...sortable.dndContextProps.accessibility,
				screenReaderInstructions: LIFT_INSTRUCTIONS,
			},
		}),
		[sortable.dndContextProps],
	)

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
