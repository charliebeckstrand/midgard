'use client'

import type { ReactNode } from 'react'
import { PanelA11yContext, type PanelA11yContextValue, PanelCloseContext } from './context'
import { usePanelCloseValue } from './use-panel-close-value'

/** Props for {@link PanelProviders}: the panel root's `onOpenChange` and a11y descriptor wired into the slot contexts. */
export type PanelProvidersProps = {
	/** The panel root's `onOpenChange`; powers the Close context. */
	onOpenChange: (open: boolean) => void
	/** A11y ids/registration from `useA11yPanel`, broadcast to the slot children. */
	a11y: PanelA11yContextValue
	children: ReactNode
}

/**
 * The shared context envelope around the children of a panel surface. The Close
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
