'use client'

import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import type { SortableOrientation } from '../../hooks'

type Options<T> = {
	items: T[]
	getKey: (item: T) => string
	orientation: SortableOrientation
	onReorder?: (next: T[]) => void
}

/**
 * Keyboard reordering for flat sortable lists. Space toggles "lifted" state,
 * arrow keys focus neighbors (or move the lifted item), Escape/Enter drops.
 * Pairs with a disabled dnd-kit keyboard sensor so the original stays visible
 * — mirrors the behavior of `useKanbanKeyboard`.
 */
export function useListKeyboard<T>({ items, getKey, orientation, onReorder }: Options<T>) {
	const [liftedId, setLiftedId] = useState<string | null>(null)

	const movingRef = useRef(false)

	const focusItem = useCallback((id: string) => {
		const el = document.querySelector(
			`[data-slot="list-item"][data-item-id="${CSS.escape(id)}"]`,
		) as HTMLElement | null

		el?.focus()
	}, [])

	const refocusItem = useCallback(
		(id: string) => {
			movingRef.current = true

			requestAnimationFrame(() => {
				focusItem(id)

				movingRef.current = false
			})
		},
		[focusItem],
	)

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

	const moveItem = useCallback(
		(id: string, direction: -1 | 1) => {
			if (!onReorder) return

			const idx = items.findIndex((i) => getKey(i) === id)

			if (idx === -1) return

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= items.length) return

			const next = [...items]

			const [item] = next.splice(idx, 1)

			if (item === undefined) return

			next.splice(newIdx, 0, item)

			onReorder(next)

			refocusItem(id)
		},
		[items, getKey, onReorder, refocusItem],
	)

	const onItemKeyDown = useCallback(
		(id: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			const primaryKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
			const secondaryKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'

			if (event.key === ' ') {
				event.preventDefault()

				setLiftedId((prev) => (prev === id ? null : id))

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
				case 'Enter':
					event.preventDefault()

					setLiftedId(null)

					break
				case primaryKey:
					event.preventDefault()

					moveItem(id, 1)

					break
				case secondaryKey:
					event.preventDefault()

					moveItem(id, -1)

					break
			}
		},
		[liftedId, orientation, focusNeighbor, moveItem],
	)

	const onItemBlur = useCallback(() => {
		if (movingRef.current) return

		setLiftedId(null)
	}, [])

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur }
}
