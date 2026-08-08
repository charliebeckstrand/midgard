import type { ReactNode } from 'react'
import { GlassContext } from './context'

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
 * @see {@link useGlass} for reading the flag at a leaf.
 */
export function GlassProvider({ children }: GlassProviderProps) {
	return (
		<GlassContext value={true}>
			<span data-slot="glass" className="contents">
				{children}
			</span>
		</GlassContext>
	)
}
