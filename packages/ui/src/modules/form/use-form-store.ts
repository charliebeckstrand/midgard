'use client'

import { useLayoutEffect, useState } from 'react'
import type { FormStateValue, FormStore } from '../../primitives/form/context'
import { createFormStore } from './engine/form-store'

/**
 * Bridges the reducer-owned form state to an external-store interface; fields
 * subscribe to their own slice via `useSyncExternalStore`.
 *
 * The reducer stays the source of truth; this mirrors each committed
 * `formState` into the store in a layout effect (before paint) and notifies
 * subscribers. Fields whose slice is unchanged bail on the next snapshot;
 * typing in one field re-renders only that field.
 *
 * @returns A referentially stable `FormStore` (`subscribe` / `getState` /
 * `getServerState`) that `FormProvider` puts in context.
 * @internal
 */
export function useFormStore(formState: FormStateValue): FormStore {
	const [{ store, publish }] = useState(() => createFormStore(formState))

	useLayoutEffect(() => {
		publish(formState)
	}, [formState, publish])

	return store
}
