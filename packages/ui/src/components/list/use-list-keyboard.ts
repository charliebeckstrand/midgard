'use client'

import { arrayMove } from '@dnd-kit/sortable'
import { type KeyboardEvent, type RefObject, useCallback, useEffect, useRef } from 'react'
import { accessibleName, announce, querySlot } from '../../core'
import { useKeyboardLifted } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import type { Orientation } from '../../types'

const itemName = (container: ParentNode | null, id: string) =>
	accessibleName(querySlot(container, 'list-item', 'item-id', id))

type Options<T> = {
	items: T[]
	getKey: (item: T) => string
	orientation: Orientation
	onReorder?: (next: T[]) => void
	/** List root; scopes item lookups so concurrent lists with overlapping ids don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}

type ListKeyDeps = {
	drop: (describe: () => string) => void
	describe: (id: string) => string
	focusNeighbor: (id: string, direction: -1 | 1 | 'start' | 'end') => boolean
	moveByDirection: (id: string, direction: -1 | 1) => void
	primaryKey: string
	secondaryKey: string
}

/** Not lifted: arrows / Home / End move focus between items. @internal */
function handleNeighborNav(id: string, event: KeyboardEvent, deps: ListKeyDeps) {
	switch (event.key) {
		case deps.primaryKey:
			if (deps.focusNeighbor(id, 1)) event.preventDefault()

			break
		case deps.secondaryKey:
			if (deps.focusNeighbor(id, -1)) event.preventDefault()

			break
		case 'Home':
			if (deps.focusNeighbor(id, 'start')) event.preventDefault()

			break
		case 'End':
			if (deps.focusNeighbor(id, 'end')) event.preventDefault()

			break
	}
}

/** Lifted: Escape / Enter drops, arrows reorder the lifted item. @internal */
function handleLiftedNav(id: string, event: KeyboardEvent, deps: ListKeyDeps) {
	switch (event.key) {
		case 'Escape':
		case 'Enter':
			event.preventDefault()

			deps.drop(() => deps.describe(id))

			break
		case deps.primaryKey:
			event.preventDefault()

			deps.moveByDirection(id, 1)

			break
		case deps.secondaryKey:
			event.preventDefault()

			deps.moveByDirection(id, -1)

			break
	}
}

/**
 * Keyboard reordering for flat sortable lists. Space toggles "lifted" state,
 * arrow keys focus neighbors (or move the lifted item), Escape/Enter drops.
 * Pairs with a disabled dnd-kit keyboard sensor, keeping the original item
 * visible during a keyboard move; mirrors `useKanbanKeyboard`. `onItemKeyDown`
 * keeps its identity: it reads the lift and the items of the last commit
 * through a ref.
 */
export function useListKeyboard<T>({
	items,
	getKey,
	orientation,
	onReorder,
	containerRef,
}: Options<T>) {
	const focusItem = useCallback(
		(id: string) => {
			const row = querySlot(containerRef.current, 'list-item', 'item-id', id)

			// The row's stop is its content area when that area is activatable (a link or a
			// button is already focusable, so it takes the reorder keys and there is only one
			// Tab stop per row); otherwise the `<li>` itself holds them. `ListItem` decides
			// which, and the `tabindex` it wrote is what says so here.
			const content = row?.querySelector<HTMLElement>('[data-slot="list-item-content"][tabindex]')

			;(content ?? row)?.focus()
		},
		[containerRef],
	)

	const {
		liftedId,
		readLifted,
		setLiftedId,
		toggleLift,
		drop,
		refocus: refocusItem,
		onBlur: onItemBlur,
	} = useKeyboardLifted(focusItem)

	const focusNeighbor = useCallback(
		(id: string, direction: -1 | 1 | 'start' | 'end') => {
			const idx = items.findIndex((i) => getKey(i) === id)

			if (idx === -1) return false

			const targetIdx =
				direction === 'start' ? 0 : direction === 'end' ? items.length - 1 : idx + direction

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

			const next = arrayMove(items, idx, newIdx)

			onReorder(next)

			announce(
				`${itemName(containerRef.current, id)} moved to position ${newIdx + 1} of ${items.length}.`,
				{ assertive: true },
			)

			refocusItem(id)
		},
		[items, getKey, onReorder, refocusItem, containerRef],
	)

	/** The item's name and its 1-based position, for announcements. */
	const describe = useCallback(
		(id: string) => {
			const index = items.findIndex((i) => getKey(i) === id)

			const where = index === -1 ? '' : `, position ${index + 1} of ${items.length}`

			return `${itemName(containerRef.current, id)}${where}`
		},
		[items, getKey, containerRef],
	)

	// The state of the last commit, for a key handler that keeps its identity. With
	// `items` in its dependencies, the handler, and through it the list context,
	// took a new identity for each move, and each item rendered.
	const latest = useRef({ orientation, describe, focusNeighbor, moveByDirection })

	useEffect(() => {
		latest.current = { orientation, describe, focusNeighbor, moveByDirection }
	})

	const onItemKeyDown = useCallback(
		(id: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			const { orientation, describe, focusNeighbor, moveByDirection } = latest.current

			const liftedId = readLifted()

			// A horizontal list follows the reading order, so its keys swap in RTL.
			// The rule is its own inverse, so it also gives the physical key for
			// each step.
			const primaryKey =
				orientation === 'horizontal'
					? logicalArrowKey('ArrowRight', containerRef.current)
					: 'ArrowDown'
			const secondaryKey =
				orientation === 'horizontal'
					? logicalArrowKey('ArrowLeft', containerRef.current)
					: 'ArrowUp'

			const deps: ListKeyDeps = {
				drop,
				describe,
				focusNeighbor,
				moveByDirection,
				primaryKey,
				secondaryKey,
			}

			if (event.key === ' ') {
				event.preventDefault()

				toggleLift(id, () => describe(id))

				return
			}

			if (liftedId !== id) {
				handleNeighborNav(id, event, deps)

				return
			}

			handleLiftedNav(id, event, deps)
		},
		[readLifted, toggleLift, drop, containerRef],
	)

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur }
}
