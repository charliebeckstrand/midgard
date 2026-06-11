'use client'

import { arrayMove } from '@dnd-kit/sortable'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { accessibleName, announce, querySlot } from '../../core'
import { useKeyboardLifted } from '../../hooks'
import type { KanbanColumnBase } from './types'

const cardName = (container: ParentNode | null, cardId: string) =>
	accessibleName(querySlot(container, 'kanban-card', 'card-id', cardId))

const columnName = (container: ParentNode | null, columnId: string) =>
	accessibleName(querySlot(container, 'kanban-column', 'column-id', columnId))

export function useKanbanKeyboard<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onValueChange,
	containerRef,
}: {
	columns: C[]
	getKey: (item: T) => string
	onValueChange?: (next: C[]) => void
	/** Board root; scopes card lookups so concurrent boards (and the drag overlay clone) don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}) {
	const focusCard = useCallback(
		(cardId: string) => {
			querySlot(containerRef.current, 'kanban-card', 'card-id', cardId)?.focus()
		},
		[containerRef],
	)

	const {
		liftedId: liftedCardId,
		setLiftedId: setLiftedCardId,
		refocus: refocusCard,
		onBlur: onCardBlur,
	} = useKeyboardLifted(focusCard)

	const findColumnByCardId = useCallback(
		(id: string) => columns.find((c) => c.items.some((i) => getKey(i) === id)),
		[columns, getKey],
	)

	// Returns the card's 1-based position within its column, used for announcements.
	const locate = useCallback(
		(cardId: string) => {
			const col = findColumnByCardId(cardId)

			if (!col) return null

			const index = col.items.findIndex((i) => getKey(i) === cardId)

			return index === -1
				? null
				: { columnId: col.id, position: index + 1, count: col.items.length }
		},
		[findColumnByCardId, getKey],
	)

	const focusNeighbor = useCallback(
		(
			cardId: string,
			key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
		) => {
			const colIdx = columns.findIndex((c) => c.items.some((i) => getKey(i) === cardId))

			if (colIdx === -1) return false

			const col = columns[colIdx]

			if (!col) return false

			const itemIdx = col.items.findIndex((i) => getKey(i) === cardId)

			let targetCol: C = col

			let targetIdx = itemIdx

			switch (key) {
				case 'ArrowUp':
					targetIdx = itemIdx - 1

					break
				case 'ArrowDown':
					targetIdx = itemIdx + 1

					break
				case 'Home':
					targetIdx = 0

					break
				case 'End':
					targetIdx = col.items.length - 1

					break
				case 'ArrowLeft':
				case 'ArrowRight': {
					const dir = key === 'ArrowLeft' ? -1 : 1

					// Skip empty columns to the next populated one in the travel
					// direction.
					let nextColIdx = colIdx + dir

					while (nextColIdx >= 0 && nextColIdx < columns.length) {
						const nextCol = columns[nextColIdx]

						if (nextCol && nextCol.items.length > 0) {
							targetCol = nextCol

							targetIdx = Math.min(itemIdx, targetCol.items.length - 1)

							break
						}

						nextColIdx += dir
					}

					if (targetCol === col) return false

					break
				}
			}

			if (targetIdx < 0 || targetIdx >= targetCol.items.length) return false

			const targetItem = targetCol.items[targetIdx]

			if (targetItem === undefined) return false

			focusCard(getKey(targetItem))

			return true
		},
		[columns, getKey, focusCard],
	)

	const moveWithinColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onValueChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const idx = col.items.findIndex((i) => getKey(i) === cardId)

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= col.items.length) return

			const nextItems = arrayMove(col.items, idx, newIdx)

			onValueChange(columns.map((c) => (c.id === col.id ? { ...c, items: nextItems } : c)) as C[])

			announce(
				`${cardName(containerRef.current, cardId)} moved to position ${newIdx + 1} of ${col.items.length} in ${columnName(containerRef.current, col.id)}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onValueChange, findColumnByCardId, refocusCard, containerRef],
	)

	const moveToColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onValueChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const colIdx = columns.findIndex((c) => c.id === col.id)

			const targetIdx = colIdx + direction

			if (targetIdx < 0 || targetIdx >= columns.length) return

			const targetCol = columns[targetIdx]

			if (!targetCol) return

			const itemIdx = col.items.findIndex((i) => getKey(i) === cardId)

			if (itemIdx === -1) return

			const item = col.items[itemIdx]

			if (item === undefined) return

			const next = columns.map((c) => {
				if (c.id === col.id) return { ...c, items: c.items.filter((_, i) => i !== itemIdx) }

				if (c.id === targetCol.id) return { ...c, items: [...c.items, item] }

				return c
			}) as C[]

			onValueChange(next)

			// The move appends the card to the end of the target column.
			const position = targetCol.items.length + 1

			announce(
				`${cardName(containerRef.current, cardId)} moved to ${columnName(containerRef.current, targetCol.id)}, position ${position} of ${position}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onValueChange, findColumnByCardId, refocusCard, containerRef],
	)

	const onCardKeyDown = useCallback(
		(cardId: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			if (event.key === ' ') {
				event.preventDefault()

				const lifting = liftedCardId !== cardId

				setLiftedCardId(lifting ? cardId : null)

				const loc = locate(cardId)

				const where = loc
					? `, position ${loc.position} of ${loc.count} in ${columnName(containerRef.current, loc.columnId)}`
					: ''

				announce(
					lifting
						? `Picked up ${cardName(containerRef.current, cardId)}${where}. Use arrow keys to move, Enter to drop.`
						: `Dropped ${cardName(containerRef.current, cardId)}${where}.`,
					{ assertive: true },
				)

				return
			}

			if (liftedCardId !== cardId) {
				switch (event.key) {
					case 'ArrowUp':
					case 'ArrowDown':
					case 'ArrowLeft':
					case 'ArrowRight':
					case 'Home':
					case 'End':
						if (focusNeighbor(cardId, event.key)) event.preventDefault()

						break
				}

				return
			}

			switch (event.key) {
				case 'Escape':
				case 'Enter': {
					event.preventDefault()

					setLiftedCardId(null)

					const loc = locate(cardId)

					const where = loc
						? `, position ${loc.position} of ${loc.count} in ${columnName(containerRef.current, loc.columnId)}`
						: ''

					announce(`Dropped ${cardName(containerRef.current, cardId)}${where}.`, {
						assertive: true,
					})

					break
				}
				case 'ArrowUp':
					event.preventDefault()

					moveWithinColumn(cardId, -1)

					break
				case 'ArrowDown':
					event.preventDefault()

					moveWithinColumn(cardId, 1)

					break
				case 'ArrowLeft':
					event.preventDefault()

					moveToColumn(cardId, -1)

					break
				case 'ArrowRight':
					event.preventDefault()

					moveToColumn(cardId, 1)

					break
			}
		},
		[
			liftedCardId,
			setLiftedCardId,
			moveWithinColumn,
			moveToColumn,
			focusNeighbor,
			locate,
			containerRef,
		],
	)

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur }
}
