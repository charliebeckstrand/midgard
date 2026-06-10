'use client'

import { useLayoutEffect, useRef } from 'react'
import type { EditableGridSnapshot, EditableGridStore } from './context'

/**
 * Bridges the navigation-owned cell state to an external-store interface; each
 * cell subscribes to its own derived slice via `useSyncExternalStore`.
 *
 * Navigation state stays the source of truth; this mirrors each committed
 * `snapshot` into the store in a layout effect (before paint) and notifies
 * subscribers. Cells whose slice is unchanged bail on the next snapshot;
 * moving the active cell re-renders only the cells whose `isActive`/`inRange`
 * flipped.
 *
 * `snapshot` must stay referentially stable while its fields are unchanged
 * (pass a memoized object); an unstable snapshot notifies every render.
 */
export function useEditableGridStore(snapshot: EditableGridSnapshot): EditableGridStore {
	const internalRef = useRef<{
		state: EditableGridSnapshot
		listeners: Set<() => void>
	} | null>(null)

	if (internalRef.current === null) {
		internalRef.current = { state: snapshot, listeners: new Set() }
	}

	const internal = internalRef.current

	useLayoutEffect(() => {
		internal.state = snapshot

		for (const listener of internal.listeners) listener()
	}, [snapshot, internal])

	const storeRef = useRef<EditableGridStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			subscribe: (listener) => {
				internal.listeners.add(listener)

				return () => {
					internal.listeners.delete(listener)
				}
			},
			getSnapshot: () => internal.state,
		}
	}

	return storeRef.current
}
