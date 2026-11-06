'use client'

import type { DragControls } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { announce } from '../core/announcer'
import {
	droppedText,
	pickedUpText,
	type ReorderSlot,
	returnedText,
} from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { sameElements } from '../utilities/same-elements'
import { useDragCursorHold } from './use-drag-cursor'

/**
 * Options for {@link useReorderDrag}: the keys, the drop report, the names for
 * the announcements, the start callback, and whether the surface takes a drag.
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
	/**
	 * Whether the surface takes a drag. When it turns false during a live drag,
	 * the drag ends as canceled before paint. A disabled surface removes only
	 * the start of the next drag, and the live Motion session runs on to the drop.
	 */
	enabled: boolean
}

/** The live drag: the dragged id, its controls, and whether a cancel ended it. */
type Drag = { id: string; controls: DragControls; canceled: boolean }

/** The place of an item in an order, for an announcement. */
const getSlot = (order: readonly string[], id: string): ReorderSlot => ({
	position: order.indexOf(id) + 1,
	total: order.length,
})

/**
 * The pointer drag of one Motion `Reorder.Group`. During a drag, Motion moves
 * the items in a draft order as the pointer passes them. The hook reports the
 * draft through `onReorder` once, on the drop, and only when the order changed.
 * Escape, a `pointercancel`, and a surface that turns disabled cancel the drag
 * and put the items back. The hook holds the drag cursor and announces the
 * pick-up, the drop, and the cancel. The keyboard lift is `useKeyboardReorder`.
 *
 * @returns `order` (the draft during a drag, else `ids`), `sorting` (whether a
 * drag is live), `setDraft` for the `onReorder` of `Reorder.Group`, and
 * `onDragStart` / `onDragEnd` for each item. `onDragEnd` takes the end event of
 * Motion.
 * @internal
 */
export function useReorderDrag({ ids, onReorder, name, onStart, enabled }: ReorderDragOptions) {
	const intl = useIntl()

	const [draft, setDraftState] = useState<string[] | null>(null)

	// The handlers read the draft at the drop, after the renders of the drag.
	const draftRef = useRef<string[] | null>(null)

	const drag = useRef<Drag | null>(null)

	const cursor = useDragCursorHold()

	const setDraft = useCallback((next: string[] | null) => {
		draftRef.current = next

		setDraftState(next)
	}, [])

	// A cancel puts the items back and stops the drag. The stop runs the drop of
	// the item, which reads `canceled` and reports nothing.
	const cancel = useCallback(
		(live: Drag) => {
			live.canceled = true

			setDraft(ids)

			live.controls.stop()
		},
		[ids, setDraft],
	)

	const onKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const live = drag.current

			if (event.key !== 'Escape' || live === null) return

			event.preventDefault()

			cancel(live)
		},
		[cancel],
	)

	// A layout effect, so the frame that shows the disabled surface shows the
	// items back in their places.
	useLayoutEffect(() => {
		const live = drag.current

		if (enabled || live === null || live.canceled) return

		cancel(live)
	}, [enabled, cancel])

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

			announce(pickedUpText(intl, name(id), getSlot(ids, id)), { assertive: true })
		},
		[ids, onStart, setDraft, cursor, unlisten, onKeyDown, name, intl],
	)

	const onDragEnd = useCallback(
		(event: Event) => {
			const live = drag.current

			const order = draftRef.current ?? ids

			drag.current = null

			setDraft(null)

			cursor.end()

			unlisten()

			if (live === null) return

			// Motion ends the drag on a `pointercancel` through the handler of a
			// `pointerup`. The browser ended the gesture, so the user dropped nothing.
			if (live.canceled || event.type === 'pointercancel') {
				announce(returnedText(intl, name(live.id), getSlot(ids, live.id)), { assertive: true })

				return
			}

			announce(droppedText(intl, name(live.id), getSlot(order, live.id)), { assertive: true })

			if (onReorder === undefined || sameElements(order, ids)) return

			onReorder(order, live.id)
		},
		[ids, onReorder, setDraft, cursor, unlisten, name, intl],
	)

	return { order: draft ?? ids, sorting: draft !== null, setDraft, onDragStart, onDragEnd }
}
