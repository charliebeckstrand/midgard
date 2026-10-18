'use client'

import {
	type Announcements,
	type ClientRect,
	closestCenter,
	type DragEndEvent,
	type DragStartEvent,
	type Modifier,
	type UniqueIdentifier,
} from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	type SortingStrategy,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { IntlShape } from 'react-intl'
import {
	droppedText,
	movedText,
	pickedUpText,
	type ReorderSlot,
	reorderMessages,
	returnedText,
} from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import type { Orientation } from '../types'
import { sameElements } from '../utilities'
import { useDragCursor } from './use-drag-cursor'
import { useIsRtl } from './use-is-rtl'
import { useSortableSensors } from './use-sortable-sensors'
import { useStableEvent } from './use-stable-event'

/**
 * dnd-kit modifier that holds a drag on the x-axis. It zeroes the vertical part
 * of the transform. It is the same as `restrictToHorizontalAxis` of
 * `@dnd-kit/modifiers`, without the dependency.
 *
 * @internal
 */
export const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 })

/**
 * dnd-kit modifier that holds a drag on the y-axis. It zeroes the horizontal part
 * of the transform. It is the same as `restrictToVerticalAxis` of
 * `@dnd-kit/modifiers`, without the dependency.
 *
 * @internal
 */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/**
 * The dnd-kit announcements of a sortable list, in the language of `intl`. Each
 * names the item and its 1-based position, never the generated id that dnd-kit
 * reads by default.
 *
 * @param intl - The intl of the reader.
 * @param itemIds - The ids in their order before the drag.
 * @param name - The name of the item with an id.
 * @internal
 */
export function sortableAnnouncements(
	intl: IntlShape,
	itemIds: readonly string[],
	name: (id: string) => string,
): Announcements {
	const label = (id: UniqueIdentifier) => name(String(id))

	const slot = (id: UniqueIdentifier): ReorderSlot => ({
		position: itemIds.indexOf(String(id)) + 1,
		total: itemIds.length,
	})

	return {
		onDragStart: ({ active }) => pickedUpText(intl, label(active.id), slot(active.id)),
		onDragOver: ({ active, over }) =>
			over ? movedText(intl, label(active.id), slot(over.id)) : undefined,
		onDragEnd: ({ active, over }) => droppedText(intl, label(active.id), slot((over ?? active).id)),
		onDragCancel: ({ active }) => returnedText(intl, label(active.id), slot(active.id)),
	}
}

/** Options for {@link useSortableList}: the items, the key extractor, the axis, and the reorder report. */
export type SortableListOptions<T> = {
	/** Ordered items. */
	items: T[]
	/** Stable key extractor. */
	getKey: (item: T) => string
	/** Called with the next ordering whenever the list reorders. Omit for read-only. */
	onReorder?: (next: T[]) => void
	/** Layout axis. @defaultValue 'vertical' */
	orientation?: Orientation
	/** Disable pointer + keyboard interaction. @defaultValue false */
	disabled?: boolean
	/** Register dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. @defaultValue true */
	keyboardSensor?: boolean
	/** Called when a drag begins, with the item being dragged. */
	onDragStart?: (item: T) => void
	/**
	 * Called when a drag concludes — a drop (whether or not it reordered) or a
	 * cancel — with the item that was dragged. Fires after any {@link onReorder},
	 * so the two together bracket the interaction.
	 */
	onDragEnd?: (item: T) => void
	/**
	 * Names an item for the drag announcements, such as its label. Without it,
	 * the announcements read the key of the item.
	 */
	describe?: (item: T) => string
}

/** A rect seen in a mirror: its left and right edges swap sides of zero. */
function mirror(rect: ClientRect): ClientRect {
	return { ...rect, left: -rect.right, right: -rect.left }
}

/**
 * `horizontalListSortingStrategy` for a row that runs right to left. The
 * strategy of dnd-kit takes the next item to be on the right. This one sorts
 * the mirrored rects and mirrors the shift back, so items of different widths
 * move by the right distance.
 *
 * @internal
 */
export const horizontalRtlSortingStrategy: SortingStrategy = (args) => {
	const shift = horizontalListSortingStrategy({
		...args,
		rects: args.rects.map(mirror),
		activeNodeRect: args.activeNodeRect && mirror(args.activeNodeRect),
	})

	return shift && { ...shift, x: -shift.x }
}

/**
 * Single-list reorder hook backed by @dnd-kit. Owns the drag lifecycle and
 * commits reorders via `arrayMove`, leaving rendering of `<DndContext>` and
 * `<SortableContext>` to the caller. It holds the grabbing cursor on the page
 * while an item is lifted. It announces each drag step by the item's name and
 * position, in the language of the reader (see {@link sortableAnnouncements}),
 * and describes the drag keys of the handles.
 *
 * @returns `{ itemIds, strategy, interactive, activeId, orientation,
 * dndContextProps }`: the keyed id list and sorting `strategy` for
 * `<SortableContext>`, plus `interactive` (false when disabled or read-only).
 * `activeId` is the item being dragged (or `null`), `orientation` is the
 * resolved axis, and `dndContextProps` (an id that the server and the browser
 * agree on, sensors, collision detection, drag handlers) spreads onto `<DndContext>`.
 */
export function useSortableList<T>({
	items,
	getKey,
	onReorder,
	orientation = 'vertical',
	disabled = false,
	keyboardSensor = true,
	onDragStart,
	onDragEnd,
	describe,
}: SortableListOptions<T>) {
	const intl = useIntl()

	const interactive = !disabled && !!onReorder

	const [activeId, setActiveId] = useState<string | null>(null)

	// The item picked up at drag start, held so `onDragEnd` fires with it from
	// both a drop and a cancel — the cancel event carries no reliable target.
	const draggedItemRef = useRef<T | null>(null)

	const sensors = useSortableSensors({ keyboard: keyboardSensor })

	// Without an id, dnd-kit makes the id of the drag description from a counter
	// that each render in the process shares. The server and the browser then
	// give different ids, and the handles point at no element.
	const id = useId()

	// dnd-kit sets no cursor, so each sortable list holds the closed hand here.
	useDragCursor(activeId !== null)

	// The previous array while the keys do not change. `SortableContext` keys its
	// own memo on this array, so a new array re-renders each sortable item. A
	// caller with an inline `getKey` or derived `items` would give one each render.
	const keys = items.map(getKey)

	const [itemIds, setItemIds] = useState(keys)

	if (!sameElements(itemIds, keys)) setItemIds(keys)

	const rtl = useIsRtl()

	const horizontalStrategy = rtl ? horizontalRtlSortingStrategy : horizontalListSortingStrategy

	const strategy = orientation === 'vertical' ? verticalListSortingStrategy : horizontalStrategy

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			setActiveId(id)

			// Resolve and cache the dragged item only when a lifecycle callback wants
			// it, so a plain reorder-only list pays nothing.
			if (onDragStart || onDragEnd) {
				const item = items.find((candidate) => getKey(candidate) === id) ?? null

				draggedItemRef.current = item

				if (item != null) onDragStart?.(item)
			}
		},
		[items, getKey, onDragStart, onDragEnd],
	)

	// The head both endings share: clear the active item and hand back the item
	// the drag carried, so each ending reports it after its own work.
	const settle = useCallback(() => {
		setActiveId(null)

		const dragged = draggedItemRef.current

		draggedItemRef.current = null

		return dragged
	}, [])

	const handleDragCancel = useCallback(() => {
		const dragged = settle()

		if (dragged != null) onDragEnd?.(dragged)
	}, [settle, onDragEnd])

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const dragged = settle()

			const { active, over } = event

			if (onReorder && over && active.id !== over.id) {
				const from = itemIds.indexOf(String(active.id))

				const to = itemIds.indexOf(String(over.id))

				if (from !== -1 && to !== -1) onReorder(arrayMove(items, from, to))
			}

			if (dragged != null) onDragEnd?.(dragged)
		},
		[settle, itemIds, items, onReorder, onDragEnd],
	)

	// Read at drag time, so an inline `describe` or `getKey` keeps the announcements.
	const nameOf = useStableEvent((id: string) => {
		const item = items.find((candidate) => getKey(candidate) === id)

		if (item === undefined) return intl.formatMessage(reorderMessages.unnamedItem)

		return describe?.(item) ?? id
	})

	// The keyboard sensor of dnd-kit drops with Space and cancels with Escape. A
	// caller with no sensor handles the keys itself, with the lift model of
	// `useKeyboardLifted`.
	const accessibility = useMemo(
		() => ({
			announcements: sortableAnnouncements(intl, itemIds, nameOf),
			screenReaderInstructions: {
				draggable: intl.formatMessage(
					keyboardSensor ? reorderMessages.sensorInstructions : reorderMessages.liftInstructions,
				),
			},
		}),
		[intl, itemIds, nameOf, keyboardSensor],
	)

	const dndContextProps = useMemo(
		() => ({
			id,
			sensors,
			collisionDetection: closestCenter,
			onDragStart: handleDragStart,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
			accessibility,
		}),
		[id, sensors, handleDragStart, handleDragEnd, handleDragCancel, accessibility],
	)

	return {
		itemIds,
		strategy,
		interactive,
		activeId,
		orientation,
		dndContextProps,
	}
}
