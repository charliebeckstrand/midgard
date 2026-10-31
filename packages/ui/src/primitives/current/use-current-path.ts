'use client'

import { use, useMemo } from 'react'
import { useKeyedStore, useKeyedValue } from '../../hooks/use-keyed-store'
import { type PathMatch, PathnameContext, type PathnameStore } from './context'

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
export function useCurrentPathStore(pathname: string | undefined): PathnameStore {
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
export function useCurrentPathMatch(href: string | undefined, match: PathMatch = 'exact'): boolean {
	const store = use(PathnameContext)

	return useKeyedValue(store?.[match] ?? null, href, false)
}
