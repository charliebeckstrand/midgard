'use client'

import { use } from 'react'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { type PathMatch, PathnameContext } from './context'

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
