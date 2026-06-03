'use client'

import { useLayoutEffect, useRef } from 'react'
import type { FormStateValue, FormStore } from './context'

/**
 * Bridges the reducer-owned form state to an external-store interface so fields
 * subscribe to just their own slice via `useSyncExternalStore`.
 *
 * The reducer stays the source of truth; this mirrors each committed
 * `formState` into the store in a layout effect (before paint) and notifies
 * subscribers. Fields whose slice is unchanged bail on the next snapshot, so
 * typing in one field re-renders only that field instead of the whole form.
 */
export function useFormStore(formState: FormStateValue): FormStore {
	const internalRef = useRef<{
		state: FormStateValue
		server: FormStateValue
		listeners: Set<() => void>
	} | null>(null)

	if (internalRef.current === null) {
		// Seed with the first committed state so SSR, hydration, and the initial
		// client render all read the same snapshot.
		internalRef.current = { state: formState, server: formState, listeners: new Set() }
	}

	const internal = internalRef.current

	useLayoutEffect(() => {
		internal.state = formState

		for (const listener of internal.listeners) listener()
	}, [formState, internal])

	const storeRef = useRef<FormStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			subscribe: (listener) => {
				internal.listeners.add(listener)

				return () => {
					internal.listeners.delete(listener)
				}
			},
			getState: () => internal.state,
			getServerState: () => internal.server,
		}
	}

	return storeRef.current
}
