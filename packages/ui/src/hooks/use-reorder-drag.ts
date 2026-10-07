'use client'

import type { DragControls } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '../core'
import { useDragCursorHold } from './use-drag-cursor'

/**
 * Options for {@link useReorderDrag}: the keys, the drop report, the names for
 * the announcements, and the start callback.
 *
 * @internal
 */
export type ReorderDragOptions = {
	/** The key of each item, in the committed order. */
	ids: string[]
	/** Called once, on the drop, with the next order and the key of the dragged item. */
	onReorder?: (order: string[], id: string) => void
	/** The accessible name of the item with the key, for the announcements. */
	name: (id: string) => string
	/** Called when a pointer drag starts, so a keyboard lift can drop. */
	onStart: () => void
}

/** The live drag: the dragged id, its controls, and whether Escape canceled it. */
type Drag = { id: string; controls: DragControls; canceled: boolean }

/** The position phrase of an announcement. */
const position = (order: readonly string[], id: string) =>
	`position ${order.indexOf(id) + 1} of ${order.length}`

/**
 * The pointer drag of one Motion `Reorder.Group`. During a drag, Motion moves
 * the items in a draft order as the pointer passes them. The hook reports the
 * draft through `onReorder` once, on the drop, and only when the order changed.
 * Escape cancels the drag and puts the items back. The hook holds the drag
 * cursor and announces the pick-up, the drop, and the cancel. The keyboard lift
 * is `useKeyboardReorder`.
 *
 * @returns `order` (the draft during a drag, else `ids`), `sorting` (whether a
 * drag is live), `setDraft` for the `onReorder` of `Reorder.Group`, and
 * `onDragStart` / `onDragEnd` for each item.
 * @internal
 */
export function useReorderDrag({ ids, onReorder, name, onStart }: ReorderDragOptions) {
	const [draft, setDraftState] = useState<string[] | null>(null)

	// The handlers read the draft at the drop, after the renders of the drag.
	const draftRef = useRef<string[] | null>(null)

	const drag = useRef<Drag | null>(null)

	const cursor = useDragCursorHold()

	const setDraft = useCallback((next: string[] | null) => {
		draftRef.current = next

		setDraftState(next)
	}, [])

	// Escape stops the drag. The stop runs the drop of the item, which reads
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

		onReorder(order, live.id)
	}, [ids, onReorder, setDraft, cursor, unlisten, name])

	return { order: draft ?? ids, sorting: draft !== null, setDraft, onDragStart, onDragEnd }
}
