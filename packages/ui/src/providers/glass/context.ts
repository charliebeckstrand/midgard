'use client'

import { createContext } from '../../core/create-context'

/**
 * Ambient flag: true inside `<GlassProvider>`. Read it through
 * {@link useGlass}, which also follows the Glass setting of the reader.
 */
export const [GlassContext, useAmbientGlass] = createContext<boolean>('Glass', { default: false })

/**
 * True while the Glass setting of the reader is `'off'`. `AppearanceProvider`
 * writes it. With no provider, the glass is on.
 */
export const [GlassOffContext, useGlassOff] = createContext<boolean>('GlassOff', {
	default: false,
})

/**
 * Whether the glass applies here: inside a `<GlassProvider>`, while the Glass
 * setting of the reader is on. Form fields switch to the glass variant when
 * no explicit variant is set. Dialog, Drawer, Sheet, Popover, Menu, and
 * Tooltip read the flag themselves through {@link useResolvedSurface}, and
 * their `glass` prop overrides it. Button does not read the flag.
 * Read at the leaf; does not compose into size resolution.
 */
export function useGlass(): boolean {
	const off = useGlassOff()

	const ambient = useAmbientGlass()

	return ambient && !off
}

/**
 * Resolve the recipe `surface` variant for a chrome panel. While the Glass
 * setting of the reader is `'off'`, the result is `undefined` for each panel.
 * Else a set `glass` prop wins: `true` gives `'glass'`, and `false` gives
 * `undefined` also inside a `<GlassProvider>`. With no `glass` prop, the
 * result follows the ambient flag. `undefined` keeps the recipe's default
 * variant.
 *
 * @param glass - The `glass` shorthand prop on the consuming component. Omit it to follow the ambient flag.
 * @returns `'glass'`, or `undefined`.
 * @see {@link useGlass}
 */
export function useResolvedSurface(glass: boolean | undefined): 'glass' | undefined {
	const off = useGlassOff()

	const ambient = useAmbientGlass()

	return !off && (glass ?? ambient) ? 'glass' : undefined
}
