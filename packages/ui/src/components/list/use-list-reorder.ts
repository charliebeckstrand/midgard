'use client'

import type { DragControls } from 'motion/react'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '../../core'
import { useDragCursorHold } from '../../hooks/use-drag-cursor'
import { listItemName } from './use-list-keyboard'

type Options<T> = {
	items: T[]
	/** The key of each item, in the order of `items`. */
	ids: string[]
	onReorder?: (next: T[]) => void
	/** List root. The announcements read the names of the items in it. */
	containerRef: RefObject<HTMLElement | null>
	/** Called when a pointer drag starts, so a keyboard lift can drop. */
	onStart: () => void
}

/** The live drag: the dragged id, its controls, and whether Escape canceled it. */
type Drag = { id: string; controls: DragControls; canceled: boolean }

/** The position phrase of an announcement. */
const position = (order: readonly string[], id: string) =>
	`position ${order.indexOf(id) + 1} of ${order.length}`

/**
 * The pointer drag of `<List>` over Motion's `Reorder`. During a drag, Motion
 * moves the rows in a draft order as the pointer passes them. The hook reports
 * the draft through `onReorder` once, on the drop, and only when the order
 * changed. Escape cancels the drag and puts the rows back. The hook holds the
 * drag cursor and announces the pick-up, the drop, and the cancel. Pairs with
 * `useListKeyboard`, which owns the keyboard lift.
 *
 * @returns `order` (the draft during a drag, else `ids`), `setDraft` for the
 * `onReorder` of `Reorder.Group`, and `onDragStart` / `onDragEnd` for each row.
 */
export function useListReorder<T>({ items, ids, onReorder, containerRef, onStart }: Options<T>) {
	const [draft, setDraftState] = useState<string[] | null>(null)

	// The handlers read the draft at the drop, after the renders of the drag.
	const draftRef = useRef<string[] | null>(null)

	const drag = useRef<Drag | null>(null)

	const cursor = useDragCursorHold()

	const setDraft = useCallback((next: string[] | null) => {
		draftRef.current = next

		setDraftState(next)
	}, [])

	const name = useCallback((id: string) => listItemName(containerRef.current, id), [containerRef])

	// Escape stops the drag. The stop runs the drop of the row, which reads
	// `canceled` and reports nothing.
	const onKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const live = drag.current

			if (event.key !== 'Escape' || live === null) return

			event.preventDefault()

			live.canceled = true

			setDraft(ids)

			live.controls.stop()
		},
		[ids, setDraft],
	)

	const listen = useRef<((event: KeyboardEvent) => void) | null>(null)

	const unlisten = useCallback(() => {
		if (listen.current) window.removeEventListener('keydown', listen.current, true)

		listen.current = null
	}, [])

	useEffect(() => unlisten, [unlisten])

	const onDragStart = useCallback(
		(id: string, controls: DragControls) => {
			onStart()

			drag.current = { id, controls, canceled: false }

			setDraft(ids)

			cursor.start()

			unlisten()

			listen.current = onKeyDown

			window.addEventListener('keydown', onKeyDown, true)

			announce(`Picked up ${name(id)}, ${position(ids, id)}.`, { assertive: true })
		},
		[ids, onStart, setDraft, cursor, unlisten, onKeyDown, name],
	)

	const onDragEnd = useCallback(() => {
		const live = drag.current

		const order = draftRef.current ?? ids

		drag.current = null

		setDraft(null)

		cursor.end()

		unlisten()

		if (live === null) return

		if (live.canceled) {
			announce(`Returned ${name(live.id)} to ${position(ids, live.id)}.`, { assertive: true })

			return
		}

		announce(`Dropped ${name(live.id)}, ${position(order, live.id)}.`, { assertive: true })

		if (onReorder === undefined || order.every((id, index) => id === ids[index])) return

		const byKey = new Map(ids.map((id, index) => [id, items[index] as T]))

		onReorder(order.flatMap((id) => byKey.get(id) ?? []))
	}, [ids, items, onReorder, setDraft, cursor, unlisten, name])

	return { order: draft ?? ids, setDraft, onDragStart, onDragEnd }
}
