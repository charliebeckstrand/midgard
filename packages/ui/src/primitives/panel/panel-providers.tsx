'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import { PanelCloseContext, usePanelCloseValue } from './panel-close-context'

type PanelA11yContextValue = {
	titleId?: string
	descriptionId?: string
	registerTitle?: (renderedId?: string) => () => void
	registerDescription?: (renderedId?: string) => () => void
}

/**
 * Broadcasts the panel's accessible-name ids and registration callbacks from
 * `useA11yPanel` to the Title / Description slots, which adopt the ids and
 * register their presence.
 */
export const [PanelA11yContext, usePanelA11y] = createContext<PanelA11yContextValue>('PanelA11y', {
	default: {},
})

/** Props for {@link PanelProviders}: the panel root's `onOpenChange` and a11y descriptor wired into the slot contexts. */
export type PanelProvidersProps = {
	/** The panel root's `onOpenChange`; powers the Close context. */
	onOpenChange: (open: boolean) => void
	/** A11y ids/registration from `useA11yPanel`, broadcast to the slot children. */
	a11y: PanelA11yContextValue
	children: ReactNode
}

/**
 * Wraps a panel surface's children in the shared context envelope. The Close
 * context (`PanelClose` and slot dismiss resolve it) nests over the A11y
 * context (Title / Description register and adopt their ids).
 */
export function PanelProviders({ onOpenChange, a11y, children }: PanelProvidersProps) {
	const closeValue = usePanelCloseValue(onOpenChange)

	return (
		<PanelCloseContext value={closeValue}>
			<PanelA11yContext value={a11y}>{children}</PanelA11yContext>
		</PanelCloseContext>
	)
}
