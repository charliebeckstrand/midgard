'use client'

import { type Placement, useClick, useInteractions } from '@floating-ui/react'
import { type ReactNode, useEffect, useId, useMemo } from 'react'
import { cn } from '../../core'
import { useFloatingDisclosure } from '../../hooks'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { PopoverContext } from './context'

/** Props for {@link Popover}: floating `placement`, controlled `open` state, and an exit-animation callback. */
export type PopoverProps = {
	/** @defaultValue 'bottom' */
	placement?: Placement
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/** Fires once the close animation finishes and the panel unmounts. */
	onExitComplete?: () => void
	className?: string
	children: ReactNode
}

/**
 * Composition root for a click-triggered, **non-modal** floating dialog;
 * supplies positioning and disclosure state to its trigger and panel via
 * context, controlled or uncontrolled through `open`/`onOpenChange`. The panel
 * does not trap focus and carries no `aria-modal`: Tab moves through it and on
 * into the page, an outside press dismisses it, and focus returns to the
 * trigger on close. Reach for `Dialog` when content needs modal containment.
 */
export function Popover({
	placement = 'bottom',
	open: openProp,
	onOpenChange,
	onExitComplete,
	className,
	children,
}: PopoverProps) {
	// The trigger (`aria-haspopup="dialog"`) and the panel (`role="dialog"`)
	// carry their own roles; `role: null` suppresses floating-ui's `useRole`,
	// which stamps a second, unnamed `role="dialog"` onto the positioning
	// wrapper. `panelId` wires the trigger's `aria-controls` to the real panel.
	const panelId = useId()

	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			onOpenChange,
			role: null,
			placement,
			offset: 8,
		})

	const click = useClick(context)

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	useEffect(() => {
		if (open) notifyOverlaySignal()
	}, [open])

	const contextValue = useMemo(
		() => ({
			open,
			panelId,
			setOpen,
			close,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			floatingContext: context,
			onExitComplete,
		}),
		[
			open,
			panelId,
			setOpen,
			close,
			triggerRef,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			context,
			onExitComplete,
		],
	)

	return (
		<PopoverContext value={contextValue}>
			<div data-slot="popover" className={cn(className)}>
				{children}
			</div>
		</PopoverContext>
	)
}
