'use client'

import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import type { KanbanColumnShape } from './context'

export function useKanbanKeyboard<T, C extends KanbanColumnShape<T>>({
	columns,
	getItemKey,
	onChange,
}: {
	columns: C[]
	getItemKey: (item: T) => string
	onChange?: (next: C[]) => void
}) {
	const [liftedCardId, setLiftedCardId] = useState<string | null>(null)

	const movingRef = useRef(false)

	const refocusCard = useCallback((cardId: string) => {
		movingRef.current = true

		requestAnimationFrame(() => {
			const el = document.querySelector(
				`[data-slot="kanban-card"][data-card-id="${CSS.escape(cardId)}"]`,
			) as HTMLElement | null

			el?.focus()

			movingRef.current = false
		})
	}, [])

	const findColumnByCardId = useCallback(
		(id: string) => columns.find((c) => c.items.some((i) => getItemKey(i) === id)),
		[columns, getItemKey],
	)

	const focusCard = useCallback((cardId: string) => {
		const el = document.querySelector(
			`[data-slot="kanban-card"][data-card-id="${CSS.escape(cardId)}"]`,
		) as HTMLElement | null

		el?.focus()
	}, [])

	const focusNeighbor = useCallback(
		(
			cardId: string,
			key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
		) => {
			const colIdx = columns.findIndex((c) => c.items.some((i) => getItemKey(i) === cardId))

			if (colIdx === -1) return false

			const col = columns[colIdx]

			if (!col) return false

			const itemIdx = col.items.findIndex((i) => getItemKey(i) === cardId)

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
					const nextColIdx = colIdx + (key === 'ArrowLeft' ? -1 : 1)

					if (nextColIdx < 0 || nextColIdx >= columns.length) return false

					const nextCol = columns[nextColIdx]

					if (!nextCol || nextCol.items.length === 0) return false

					targetCol = nextCol

					targetIdx = Math.min(itemIdx, targetCol.items.length - 1)

					break
				}
			}

			if (targetIdx < 0 || targetIdx >= targetCol.items.length) return false

			const targetItem = targetCol.items[targetIdx]

			if (targetItem === undefined) return false

			focusCard(getItemKey(targetItem))

			return true
		},
		[columns, getItemKey, focusCard],
	)

	const moveWithinColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const idx = col.items.findIndex((i) => getItemKey(i) === cardId)

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= col.items.length) return

			const nextItems = [...col.items]

			const [item] = nextItems.splice(idx, 1)

			if (item === undefined) return

			nextItems.splice(newIdx, 0, item)

			onChange(columns.map((c) => (c.id === col.id ? { ...c, items: nextItems } : c)) as C[])

			refocusCard(cardId)
		},
		[columns, getItemKey, onChange, findColumnByCardId, refocusCard],
	)

	const moveToColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const colIdx = columns.findIndex((c) => c.id === col.id)

			const targetIdx = colIdx + direction

			if (targetIdx < 0 || targetIdx >= columns.length) return

			const targetCol = columns[targetIdx]

			if (!targetCol) return

			const itemIdx = col.items.findIndex((i) => getItemKey(i) === cardId)

			if (itemIdx === -1) return

			const item = col.items[itemIdx]

			if (item === undefined) return

			const next = columns.map((c) => {
				if (c.id === col.id) return { ...c, items: c.items.filter((_, i) => i !== itemIdx) }

				if (c.id === targetCol.id) return { ...c, items: [...c.items, item] }

				return c
			}) as C[]

			onChange(next)

			refocusCard(cardId)
		},
		[columns, getItemKey, onChange, findColumnByCardId, refocusCard],
	)

	const onCardKeyDown = useCallback(
		(cardId: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			if (event.key === ' ') {
				event.preventDefault()

				setLiftedCardId((prev) => (prev === cardId ? null : cardId))

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
				case 'Enter':
					event.preventDefault()

					setLiftedCardId(null)

					break
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
		[liftedCardId, moveWithinColumn, moveToColumn, focusNeighbor],
	)

	const onCardBlur = useCallback(() => {
		// Skip blur events caused by cross-column refocusing.
		if (movingRef.current) return

		setLiftedCardId(null)
	}, [])

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur }
}
