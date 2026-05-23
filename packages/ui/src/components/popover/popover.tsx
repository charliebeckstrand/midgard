'use client'

import { type Placement, useClick, useInteractions } from '@floating-ui/react'
import { type ReactNode, useEffect, useMemo } from 'react'
import { cn } from '../../core'
import { useFloatingDisclosure } from '../../hooks'
import { notifyOverlaySignal } from '../../primitives/overlay'
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
	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			onOpenChange,
			role: 'dialog',
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
			triggerRef,
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
