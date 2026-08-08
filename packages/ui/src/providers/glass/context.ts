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
 * Resolve the recipe `surface` variant for a chrome panel: `'glass'` when either
 * the `glass` shorthand prop or an enclosing `<GlassProvider>` ambient is set,
 * otherwise `undefined` so the recipe's default variant stays in effect.
 *
 * @param glass - The `glass` shorthand prop on the consuming component.
 * @returns `'glass'`, or `undefined`.
 * @see {@link useGlass}
 */
export function useResolvedSurface(glass: boolean | undefined): 'glass' | undefined {
	const glassContext = useGlass()

	return glass || glassContext ? 'glass' : undefined
}
