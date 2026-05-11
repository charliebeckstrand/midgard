'use client'

import { createContext } from '../../core'

/**
 * Ambient flag — true inside `<Glass>`. Form fields and Button switch to the
 * glass variant when no explicit variant is set; surface chrome takes a
 * `glass` prop and consumers pass `useGlass()` through. See `src/CASCADES.md`.
 */
export const [GlassProvider, useGlass] = createContext<boolean>('Glass', { default: false })

/**
 * Resolve the `surface` variant for a chrome panel, falling back to `'glass'`
 * when either the `glass` shorthand prop or an enclosing `<Glass>` ambient is
 * set. Returns `undefined` when no surface should be applied so recipe
 * default variants stay in effect.
 */
export function useResolvedSurface<S extends string>(
	surface: S | undefined,
	glass: boolean | undefined,
): S | 'glass' | undefined {
	const glassContext = useGlass()
	return surface ?? (glass || glassContext ? 'glass' : undefined)
}
