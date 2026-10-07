'use client'

import { type RefObject, useMemo } from 'react'
import { useSortableList } from '../../hooks'
import { LIFT_INSTRUCTIONS } from '../../hooks/use-keyboard-lifted'
import type { Orientation } from '../../types'
import { listItemName } from './use-list-keyboard'

type Options<T> = {
	items: T[]
	getKey: (item: T) => string
	onReorder: (next: T[]) => void
	orientation: Orientation
	disabled?: boolean
	/** List root. The announcements read the names of the items in it. */
	containerRef: RefObject<HTMLElement | null>
}

/**
 * DnD orchestration for `<ListSortable>`. It wraps `useSortableList` and resolves
 * the active item being dragged. The announcements name each item, and the
 * instructions give the keys of the lift model. Pairs with `useListKeyboard`; mirrors
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
	const sortable = useSortableList({
		items,
		getKey,
		onReorder,
		orientation,
		disabled,
		keyboardSensor: false,
		describe: (item) => listItemName(containerRef.current, getKey(item)),
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

	const activeItem = activeId ? (items.find((item) => getKey(item) === activeId) ?? null) : null

	const activeIndex = activeItem ? items.indexOf(activeItem) : -1

	return {
		itemIds,
		strategy,
		interactive,
		activeId,
		activeItem,
		activeIndex,
		dndContextProps,
	}
}
