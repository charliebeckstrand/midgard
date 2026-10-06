'use client'

import { use, useMemo } from 'react'
import { createContext } from '../../core'
import { useKeyedStore, useKeyedValue } from '../../hooks/use-keyed-store'
import type { KeyedStore } from '../../utilities'

/**
 * How an `href` matches the current path. `exact` matches the path of the
 * `href` alone. `prefix` also matches each path under it, such as
 * `/users/42` for `/users`, so a section root stays current on its sub-pages.
 */
export type PathMatch = 'exact' | 'prefix'

/**
 * Whether each `href` matches the current path, one store for each
 * {@link PathMatch}. An item subscribes to its own `href`.
 *
 * @internal
 */
export type PathnameStore = Record<PathMatch, KeyedStore<string, boolean>>

/**
 * Carries the {@link PathnameStore} of the nearest `UIProvider` that has a
 * `pathname`. The value keeps its identity when the path changes, so a
 * navigation does not render each item. `undefined` outside such a provider.
 *
 * @internal
 */
export const [PathnameContext] = createContext<PathnameStore | undefined>('Pathname', {
	default: undefined,
})

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
