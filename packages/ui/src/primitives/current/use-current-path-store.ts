'use client'

import { useMemo } from 'react'
import { useKeyedStore } from '../../hooks/use-keyed-store'
import type { PathnameStore } from './context'

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
