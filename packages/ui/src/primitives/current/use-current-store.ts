'use client'

import { useMemo } from 'react'
import { keyMatcher, useKeyedStore } from '../../hooks/use-keyed-store'
import type { CurrentContextValue, CurrentStore } from './context'

/**
 * Makes the {@link CurrentStore} of a root from its {@link CurrentContextValue}.
 *
 * @returns A store that keeps its identity while `onValueChange` keeps its
 * identity. Pass it into {@link CurrentStoreContext}.
 *
 * @remarks
 * The hook publishes the current value in a layout effect. A change therefore
 * calls only the listeners of the value that stops being current and of the
 * value that becomes current.
 *
 * @internal
 */
export function useCurrentStore(state: CurrentContextValue): CurrentStore {
	const { value, onValueChange } = state

	const current = useKeyedStore(value, keyMatcher)

	return useMemo(() => ({ current, onValueChange }), [current, onValueChange])
}
