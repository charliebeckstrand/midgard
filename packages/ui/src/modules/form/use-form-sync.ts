'use client'

import { type Dispatch, useState } from 'react'
import type { FormAction } from './engine/types'

/**
 * Tracks the controlled `values` prop of a form. A reference change replaces
 * `values` and shifts the dirty baseline. The `touched`, `errors`, and
 * `submitting` state stays. A change to `undefined` syncs to the
 * `defaultValues` of the mount.
 *
 * @param values - The controlled `values` prop.
 * @param defaultValues - The `defaultValues` prop. The hook keeps the value of
 * the mount, because the reducer's `defaults` shift on each sync.
 * @param dispatch - The dispatch of the form reducer.
 * @remarks The sync dispatches during render. React then renders the form again
 * before the commit, so the old values never commit with the new prop. Use
 * `reset(nextDefaults)` to also clear touched and errors.
 * @internal
 */
export function useFormSync<T>(
	values: T | undefined,
	defaultValues: T,
	dispatch: Dispatch<FormAction<T>>,
): void {
	// State, not a ref, because the sync below reads it during render.
	const [initialDefaults] = useState(defaultValues)

	const [lastSyncedValues, setLastSyncedValues] = useState(values)

	if (values !== lastSyncedValues) {
		setLastSyncedValues(values)

		dispatch({ type: 'sync-values', values: values ?? initialDefaults })
	}
}
