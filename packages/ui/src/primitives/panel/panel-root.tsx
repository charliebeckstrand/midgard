'use client'

import { type ReactNode, useId, useMemo } from 'react'
import { useControllableFlag } from '../../hooks/use-controllable'
import { PanelStateContext } from './context'

/** Props for {@link PanelRoot}: the open state, controlled or uncontrolled. */
export type PanelRootProps = {
	/**
	 * Controlled open state. Pair it with `onOpenChange`.
	 * @defaultValue Uncontrolled, with `defaultOpen` as the first state.
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
 * The root that holds the open state of a panel and gives it to the trigger and
 * the panel, which read it with {@link usePanelState}. Controlled when `open` is
 * set, and uncontrolled from `defaultOpen` when it is not. It renders no element.
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
