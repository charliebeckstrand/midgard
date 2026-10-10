'use client'

import { useClick, useInteractions } from '@floating-ui/react'
import { type ReactNode, useEffect, useId, useMemo, useState } from 'react'
import { cn } from '../../core'
import { type FloatingPlacement, useFloatingDisclosure } from '../../hooks'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { PopoverContext, PopoverPositionContext } from './context'

/** Props for {@link Popover}: floating `placement` and controlled or uncontrolled `open` state. */
export type PopoverProps = {
	/**
	 * The side and the alignment of the panel. A `<side>-auto` value aligns the panel to the
	 * edge of the trigger that is nearer to the edge of the viewport.
	 * @defaultValue 'bottom'
	 */
	placement?: FloatingPlacement
	/**
	 * Controlled open state. Pair with `onOpenChange`.
	 *
	 * @defaultValue Uncontrolled: the state starts from `defaultOpen`.
	 */
	open?: boolean
	/**
	 * Initial open state when uncontrolled.
	 * @defaultValue false
	 */
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Classes for the root. The root is `display: contents`, so it adds no box to the layout, and a
	 * box utility has no effect on it. A display class, such as `block`, replaces `contents`.
	 */
	className?: string
	children: ReactNode
}

/**
 * Composition root for a click-triggered, **non-modal** floating dialog;
 * supplies positioning and disclosure state to its trigger and panel via
 * context, controlled or uncontrolled through `open`/`onOpenChange`. The panel
 * does not trap focus and carries no `aria-modal`. Tab moves through it and on
 * into the page, an outside press dismisses it, and focus returns to the trigger
 * on close. Reach for `Dialog` when content needs modal containment.
 */
export function Popover({
	placement = 'bottom',
	open: openProp,
	defaultOpen,
	onOpenChange,
	className,
	children,
}: PopoverProps) {
	// The trigger (`aria-haspopup="dialog"`) and the panel (`role="dialog"`)
	// carry their own roles; `role: null` suppresses floating-ui's `useRole`,
	// which stamps a second, unnamed `role="dialog"` onto the positioning
	// wrapper. `panelId` wires the trigger's `aria-controls` to the real panel.
	const panelId = useId()

	// The panel reports its role, because only a named panel is a dialog.
	const [dialog, setDialog] = useState(true)

	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			defaultOpen,
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
			dialog,
			setDialog,
			setOpen,
			close,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			panelId,
			dialog,
			setOpen,
			close,
			triggerRef,
			refs.setReference,
			refs.setFloating,
			getReferenceProps,
			getFloatingProps,
		],
	)

	// Both members re-identify on every reposition, so they ride a context of
	// their own that only the panel reads.
	const position = useMemo(
		() => ({ floatingStyles, floatingContext: context }),
		[floatingStyles, context],
	)

	return (
		<PopoverContext value={contextValue}>
			<PopoverPositionContext value={position}>
				{/* contents: the root only holds the context. A box here takes the place of the
				    trigger in the layout of its parent, and breaks a run of text in two. The root
				    is a `<span>`, so it is valid in phrasing content such as a `<p>`. The panel
				    renders in a portal, so only the trigger is inside the `<span>`. */}
				<span data-slot="popover" className={cn('contents', className)}>
					{children}
				</span>
			</PopoverPositionContext>
		</PopoverContext>
	)
}
