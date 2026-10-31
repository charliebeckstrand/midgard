'use client'

import { use, useMemo } from 'react'
import { keyMatcher, useKeyedStore, useKeyedValue } from '../../hooks/use-keyed-store'
import {
	CurrentContext,
	type CurrentContextValue,
	type CurrentStore,
	CurrentStoreContext,
} from './context'

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

/**
 * Reads whether `value` is the current value, and the change handler of the
 * root.
 *
 * @returns `current`, which is `false` for an unvalued item, and `onValueChange`.
 *
 * @remarks
 * Under a root that gives a {@link CurrentStore}, the item subscribes to its own
 * value. It then renders only when its own `current` changes. Under a
 * {@link CurrentContext} alone, the item reads the context.
 *
 * @internal
 */
export function useCurrentItem(value: string | undefined): {
	current: boolean
	onValueChange: ((value: string | null) => void) | undefined
} {
	const store = use(CurrentStoreContext)

	const stored = useKeyedValue(store?.current ?? null, value, false)

	if (store) return { current: stored, onValueChange: store.onValueChange }

	// Without a store, the item reads the context. `use` can run in a condition.
	const context = use(CurrentContext)

	return {
		current: value !== undefined && context?.value === value,
		onValueChange: context?.onValueChange,
	}
}
