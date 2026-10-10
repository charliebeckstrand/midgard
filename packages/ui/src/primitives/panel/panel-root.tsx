'use client'

import { type ReactNode, useId, useMemo } from 'react'
import { createContext } from '../../core'
import { useControllableFlag } from '../../hooks/use-controllable'

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

/** Props for {@link PanelRoot}: the open state, controlled or uncontrolled. */
export type PanelRootProps = {
	/**
	 * Controlled open state. Pair with `onOpenChange`.
	 * @defaultValue Uncontrolled: the state starts from `defaultOpen`.
	 */
	open?: boolean
	/**
	 * Initial open state when uncontrolled.
	 * @defaultValue false
	 */
	defaultOpen?: boolean
	/** Fires when the open state changes: from the trigger, a close part, Escape, or the backdrop. */
	onOpenChange?: (open: boolean) => void
	/** The trigger, the panel, and any other content. */
	children: ReactNode
}

/**
 * Holds the open state of a panel and gives it to the trigger and the panel,
 * which read it with {@link usePanelState}. Controlled when `open` is set, and
 * uncontrolled from `defaultOpen` when it is not. It renders no element.
 */
export function PanelRoot({ open, defaultOpen, onOpenChange, children }: PanelRootProps) {
	const [resolvedOpen, setOpen] = useControllableFlag({
		value: open,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const panelId = useId()

	const value = useMemo(
		() => ({ open: resolvedOpen, setOpen, panelId }),
		[resolvedOpen, setOpen, panelId],
	)

	return <PanelStateContext value={value}>{children}</PanelStateContext>
}
