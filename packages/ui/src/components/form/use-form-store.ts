'use client'

import { useLayoutEffect, useState } from 'react'
import { createEmitter } from '../../utilities'
import type { FormStateValue, FormStore } from './context'

/**
 * Makes the store for one form, and the function that publishes a committed
 * state to it. Both `state` and `server` start from the first state, so SSR,
 * hydration, and the first client render share one snapshot.
 */
function createFormStore(initial: FormStateValue): {
	store: FormStore
	publish: (state: FormStateValue) => void
} {
	let state = initial

	const { subscribe, emit } = createEmitter()

	return {
		store: {
			subscribe,
			getState: () => state,
			getServerState: () => initial,
		},
		publish: (next) => {
			state = next

			emit()
		},
	}
}

/**
 * Bridges the reducer-owned form state to an external-store interface; fields
 * subscribe to their own slice via `useSyncExternalStore`.
 *
 * The reducer stays the source of truth; this mirrors each committed
 * `formState` into the store in a layout effect (before paint) and notifies
 * subscribers. Fields whose slice is unchanged bail on the next snapshot;
 * typing in one field re-renders only that field.
 *
 * @returns A referentially stable {@link FormStore} (`subscribe` / `getState` /
 * `getServerState`) wired into context by {@link FormProvider}.
 * @internal
 */
export function useFormStore(formState: FormStateValue): FormStore {
	const [{ store, publish }] = useState(() => createFormStore(formState))

	useLayoutEffect(() => {
		publish(formState)
	}, [formState, publish])

	return store
}
