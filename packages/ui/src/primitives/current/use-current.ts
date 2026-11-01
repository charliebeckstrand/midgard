'use client'

import { use } from 'react'
import { useKeyedValue } from '../../hooks/use-keyed-value'
import { CurrentContext, CurrentStoreContext } from './context'

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
