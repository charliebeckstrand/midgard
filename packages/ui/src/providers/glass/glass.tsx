import type { ReactNode } from 'react'
import { GlassScope } from './glass-scope'

/** Props for {@link GlassProvider}. */
export type GlassProviderProps = {
	children: ReactNode
}

/**
 * Sets the ambient glass flag for the wrapped subtree, switching every
 * glass-aware descendant to its glass variant. Form fields and Button adopt
 * the glass variant when no explicit variant is set; surface chrome (Popover,
 * Dialog, etc.) reads the flag through `useGlass()`. Renders a `display:
 * contents` span.
 *
 * @remarks The file has no `'use client'`, so an RSC tree can host the
 * provider. A client leaf writes the context.
 *
 * @see {@link useGlass} for reading the flag at a leaf.
 */
export function GlassProvider({ children }: GlassProviderProps) {
	return (
		<GlassScope>
			<span data-slot="glass" className="contents">
				{children}
			</span>
		</GlassScope>
	)
}
