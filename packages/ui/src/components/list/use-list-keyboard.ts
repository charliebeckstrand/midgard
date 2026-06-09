'use client'

import { type KeyboardEvent, useCallback } from 'react'
import { accessibleName, announce, querySlot } from '../../core'
import { useKeyboardLifted } from '../../hooks'
import type { Orientation } from '../../types'
import { moveItem } from '../../utilities'

const itemName = (id: string) => accessibleName(querySlot('list-item', 'item-id', id))

type Options<T> = {
	items: T[]
	getKey: (item: T) => string
	orientation: Orientation
	onReorder?: (next: T[]) => void
}

/**
 * Keyboard reordering for flat sortable lists. Space toggles "lifted" state,
 * arrow keys focus neighbors (or move the lifted item), Escape/Enter drops.
 * Pairs with a disabled dnd-kit keyboard sensor, keeping the original item
 * visible during a keyboard move — mirrors the behavior of `useKanbanKeyboard`.
 */
export function useListKeyboard<T>({ items, getKey, orientation, onReorder }: Options<T>) {
	const focusItem = useCallback((id: string) => {
		querySlot('list-item', 'item-id', id)?.focus()
	}, [])

	const {
		liftedId,
		setLiftedId,
		refocus: refocusItem,
		onBlur: onItemBlur,
	} = useKeyboardLifted(focusItem)

	const focusNeighbor = useCallback(
		(id: string, direction: -1 | 1 | 'start' | 'end') => {
			const idx = items.findIndex((i) => getKey(i) === id)

			if (idx === -1) return false

			let targetIdx = idx

			if (direction === 'start') targetIdx = 0
			else if (direction === 'end') targetIdx = items.length - 1
			else targetIdx = idx + direction

			if (targetIdx < 0 || targetIdx >= items.length || targetIdx === idx) return false

			const target = items[targetIdx]

			if (target === undefined) return false

			focusItem(getKey(target))

			return true
		},
		[items, getKey, focusItem],
	)

	const moveByDirection = useCallback(
		(id: string, direction: -1 | 1) => {
			if (!onReorder) return

			const idx = items.findIndex((i) => getKey(i) === id)

			if (idx === -1) return

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= items.length) return

			const next = moveItem(items, idx, newIdx)

			if (!next) return

			onReorder(next)

			announce(`${itemName(id)} moved to position ${newIdx + 1} of ${items.length}.`, {
				assertive: true,
			})

			refocusItem(id)
		},
		[items, getKey, onReorder, refocusItem],
	)

	// Card's current 1-based position, for announcements.
	const locate = useCallback(
		(id: string) => {
			const index = items.findIndex((i) => getKey(i) === id)

			return index === -1 ? null : { position: index + 1, count: items.length }
		},
		[items, getKey],
	)

	const onItemKeyDown = useCallback(
		(id: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			const primaryKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
			const secondaryKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'

			if (event.key === ' ') {
				event.preventDefault()

				const lifting = liftedId !== id

				setLiftedId(lifting ? id : null)

				const loc = locate(id)

				const where = loc ? `, position ${loc.position} of ${loc.count}` : ''

				announce(
					lifting
						? `Picked up ${itemName(id)}${where}. Use arrow keys to move, Enter to drop.`
						: `Dropped ${itemName(id)}${where}.`,
					{ assertive: true },
				)

				return
			}

			if (liftedId !== id) {
				switch (event.key) {
					case primaryKey:
						if (focusNeighbor(id, 1)) event.preventDefault()

						break
					case secondaryKey:
						if (focusNeighbor(id, -1)) event.preventDefault()

						break
					case 'Home':
						if (focusNeighbor(id, 'start')) event.preventDefault()

						break
					case 'End':
						if (focusNeighbor(id, 'end')) event.preventDefault()

						break
				}

				return
			}

			switch (event.key) {
				case 'Escape':
				case 'Enter': {
					event.preventDefault()

					setLiftedId(null)

					const loc = locate(id)

					announce(
						`Dropped ${itemName(id)}${loc ? `, position ${loc.position} of ${loc.count}` : ''}.`,
						{ assertive: true },
					)

					break
				}
				case primaryKey:
					event.preventDefault()

					moveByDirection(id, 1)

					break
				case secondaryKey:
					event.preventDefault()

					moveByDirection(id, -1)

					break
			}
		},
		[liftedId, setLiftedId, orientation, focusNeighbor, moveByDirection, locate],
	)

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur }
}
