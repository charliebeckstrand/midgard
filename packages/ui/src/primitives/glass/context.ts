'use client'

import { createContext } from '../../core/create-context'

/**
 * Ambient flag: true inside `<GlassProvider>`. Read it through
 * {@link useGlass}.
 */
export const [GlassContext, useAmbientGlass] = createContext<boolean>('Glass', { default: false })

/**
 * True while the Surfaces setting of the reader is `'glass'`.
 * `AppearanceProvider` writes it. With no provider, the surfaces are solid.
 */
export const [GlassSurfacesContext, useGlassSurfaces] = createContext<boolean>('GlassSurfaces', {
	default: false,
})

/**
 * Whether the glass applies here: true inside a `<GlassProvider>`. Form fields
 * switch to the glass variant when no explicit variant is set. Popover, Menu,
 * and Tooltip read the flag themselves through {@link useResolvedSurface}, and
 * their `glass` prop overrides it. Dialog, Drawer, and Sheet do not read the
 * flag: they follow the Surfaces setting of the reader
 * ({@link useReaderSurface}). Button does not read the flag.
 * Read at the leaf; does not compose into size resolution.
 */
export function useGlass(): boolean {
	return useAmbientGlass()
}

/**
 * Resolve the recipe `surface` variant for the panel of a Dialog, a Drawer, or
 * a Sheet. It follows only the Surfaces setting of the reader: `'glass'` gives
 * `'glass'`, and `'solid'` gives `undefined`. A `<GlassProvider>` does not
 * change it.
 *
 * @returns `'glass'`, or `undefined` for the recipe's default variant.
 */
export function useReaderSurface(): 'glass' | undefined {
	return useGlassSurfaces() ? 'glass' : undefined
}

/**
 * Resolve the recipe `surface` variant for a Popover, a Menu, or a Tooltip. A
 * set `glass` prop wins: `true` gives `'glass'`, and `false` gives `undefined`
 * also inside a `<GlassProvider>`. With no `glass` prop, the result follows the
 * ambient flag. `undefined` keeps the recipe's default variant. The Surfaces
 * setting of the reader does not change it.
 *
 * @param glass - The `glass` shorthand prop on the consuming component. Omit it to follow the ambient flag.
 * @returns `'glass'`, or `undefined`.
 * @see {@link useGlass}
 */
export function useResolvedSurface(glass: boolean | undefined): 'glass' | undefined {
	const ambient = useAmbientGlass()

	return (glass ?? ambient) ? 'glass' : undefined
}
