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

			const itemIdx = col.items.findIndex((i) => getItemKey(i) === cardId)

			if (itemIdx === -1) return

			const item = col.items[itemIdx]

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
			if (event.key === ' ') {
				event.preventDefault()

				setLiftedCardId((prev) => (prev === cardId ? null : cardId))

				return
			}

			if (liftedCardId !== cardId) return

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
		[liftedCardId, moveWithinColumn, moveToColumn],
	)

	const onCardBlur = useCallback(() => {
		// Skip blur events caused by cross-column refocusing.
		if (movingRef.current) return

		setLiftedCardId(null)
	}, [])

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur }
}
