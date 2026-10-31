'use client'

import { use, useMemo } from 'react'
import { keyMatcher, useKeyedStore, useKeyedValue } from '../../hooks/use-keyed-store'
import {
	CurrentContext,
	type CurrentContextValue,
	type CurrentStore,
	CurrentStoreContext,
	type PathMatch,
	PathnameContext,
	type PathnameStore,
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

/** A {@link useKeyedStore} reader for exact matches. */
function exactMatcher(pathname: string | undefined): (href: string) => boolean {
	return (href) => href === pathname
}

/** A {@link useKeyedStore} reader for prefix matches. A path is under `href` at a `/` boundary. */
function prefixMatcher(pathname: string | undefined): (href: string) => boolean {
	return (href) =>
		pathname !== undefined &&
		(pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`))
}

/**
 * Makes the {@link PathnameStore} of a provider from the current path.
 *
 * @returns A store that keeps its identity. Pass it into {@link PathnameContext}.
 *
 * @remarks
 * The hook publishes the path in a layout effect. A navigation therefore calls
 * only the listeners of the items that stop matching and the items that start
 * to match.
 *
 * @internal
 */
export function usePathnameStore(pathname: string | undefined): PathnameStore {
	const exact = useKeyedStore(pathname, exactMatcher)

	const prefix = useKeyedStore(pathname, prefixMatcher)

	return useMemo(() => ({ exact, prefix }), [exact, prefix])
}

/**
 * Reads whether `href` matches the current path of the nearest `UIProvider`.
 *
 * @returns `false` without an `href`, or outside a provider that has a `pathname`.
 * The caller renders only when the result changes.
 * @internal
 */
export function usePathMatch(href: string | undefined, match: PathMatch = 'exact'): boolean {
	const store = use(PathnameContext)

	return useKeyedValue(store?.[match] ?? null, href, false)
}
