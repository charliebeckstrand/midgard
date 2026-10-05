'use client'

import { createContext } from '../../core'

/**
 * Ambient flag: true inside `<GlassProvider>`. Form fields switch to the glass
 * variant when no explicit variant is set. Dialog, Drawer, Sheet, Popover,
 * Menu, and Tooltip read the flag themselves through {@link useResolvedSurface},
 * and their `glass` prop overrides it. Button does not read the flag.
 * Read at the leaf; does not compose into size resolution.
 */
export const [GlassContext, useGlass] = createContext<boolean>('Glass', { default: false })

/**
 * Resolve the recipe `surface` variant for a chrome panel. A set `glass` prop
 * wins: `true` gives `'glass'`, and `false` gives `undefined` also inside a
 * `<GlassProvider>`. With no `glass` prop, the result follows the ambient flag.
 * `undefined` keeps the recipe's default variant.
 *
 * @param glass - The `glass` shorthand prop on the consuming component. Omit it to follow the ambient flag.
 * @returns `'glass'`, or `undefined`.
 * @see {@link useGlass}
 */
export function useResolvedSurface(glass: boolean | undefined): 'glass' | undefined {
	const glassContext = useGlass()

	return (glass ?? glassContext) ? 'glass' : undefined
}
