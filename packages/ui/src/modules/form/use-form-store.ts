'use client'

import { useLayoutEffect, useState } from 'react'
import type { FormStateValue, FormStore } from '../../primitives/form/context'
import { createFormStore } from './engine/form-store'

/**
 * Gives the form state of the reducer as an external store. Each field
 * subscribes to its own part of the state through `useSyncExternalStore`.
 *
 * The reducer stays the source of the state. A layout effect copies each
 * committed `formState` into the store before paint, and tells the
 * subscribers. A field whose part did not change does not render again, so a
 * keystroke in one field renders only that field.
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
