'use client'

import { type Placement, useClick, useDismiss, useInteractions, useRole } from '@floating-ui/react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useFloatingPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { notifyOverlayOpened } from '../../primitives/overlay'
import { PopoverProvider } from './context'

export type PopoverProps = {
	placement?: Placement
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onExitComplete?: () => void
	className?: string
	children: ReactNode
}

export function Popover({
	placement = 'bottom',
	open: openProp,
	onOpenChange,
	onExitComplete,
	className,
	children,
}: PopoverProps) {
	const [open = false, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		onOpenChange: setOpen,
		offset: 8,
		restoreFocusTo: triggerRef,
	})

	const click = useClick(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'dialog' })

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	useEffect(() => {
		if (open) notifyOverlayOpened()
	}, [open])

	const contextValue = useMemo(
		() => ({
			open,
			setOpen,
			close,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			onExitComplete,
		}),
		[
			open,
			setOpen,
			close,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			onExitComplete,
		],
	)

	return (
		<PopoverProvider value={contextValue}>
			<div data-slot="popover" className={cn(className)}>
				{children}
			</div>
		</PopoverProvider>
	)
}
