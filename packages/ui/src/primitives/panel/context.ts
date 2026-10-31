'use client'

import { createContext } from '../../core'

type PanelStateContextValue = {
	/** Whether the panel is open. */
	open: boolean
	/** Sets the open state. The trigger, the close parts, and the dismissal all call it. */
	setOpen: (open: boolean) => void
	/** The id of the panel. The trigger names it in `aria-controls`. */
	panelId: string
}

/**
 * Carries the open state of a Dialog, Sheet, or Drawer root to its trigger and
 * its panel. `usePanelState` reads it, and throws outside a root.
 */
export const [PanelStateContext, usePanelState] = createContext<PanelStateContextValue>(
	'PanelState',
	{ error: 'A panel trigger or panel must be rendered inside a Dialog, Sheet, or Drawer' },
)

export type PanelA11yContextValue = {
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

type PanelCloseContextValue = {
	close: () => void
}

/**
 * Carries the panel's `close()` callback to `PanelClose` and slot dismiss
 * controls; `usePanelCloseContext` reads it. Throws when consumed outside a
 * Dialog, Sheet, or Drawer.
 */
export const [PanelCloseContext, usePanelCloseContext] = createContext<PanelCloseContextValue>(
	'PanelClose',
	{ error: 'PanelClose must be rendered inside a Dialog, Sheet, or Drawer' },
)
