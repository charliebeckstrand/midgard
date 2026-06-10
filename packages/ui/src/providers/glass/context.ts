'use client'

import { createContext } from '../../core'

/**
 * Ambient flag: true inside `<GlassProvider>`. Form fields and Button switch to the
 * glass variant when no explicit variant is set; surface chrome (Popover,
 * Dialog, etc.) takes a `glass` prop and consumers pass `useGlass()` through.
 * Read at the leaf; does not compose into size resolution.
 */
export const [GlassContext, useGlass] = createContext<boolean>('Glass', { default: false })

/**
 * Resolve the `surface` variant for a chrome panel, falling back to `'glass'`
 * when either the `glass` shorthand prop or an enclosing `<GlassProvider>` ambient is
 * set. Returns `undefined` when no surface applies; recipe default variants
 * stay in effect.
 */
export function useResolvedSurface<S extends string>(
	surface: S | undefined,
	glass: boolean | undefined,
): S | 'glass' | undefined {
	const glassContext = useGlass()

	return surface ?? (glass || glassContext ? 'glass' : undefined)
}
