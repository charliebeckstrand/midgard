'use client'

import { type Placement, useClick, useDismiss, useInteractions, useRole } from '@floating-ui/react'
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { cn, createContext } from '../../core'
import { useFloatingPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'

type PopoverContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	onExitComplete?: () => void
}

const [PopoverProvider, usePopoverContext] = createContext<PopoverContextValue>('Popover')

export { usePopoverContext }

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
		onChange: (next) => onOpenChange?.(next ?? false),
	})

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		onOpenChange: setOpen,
		offset: 8,
	})

	const click = useClick(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'dialog' })

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	const prevOpenRef = useRef(open)

	useEffect(() => {
		if (prevOpenRef.current && !open) {
			triggerRef.current?.focus()
		}

		prevOpenRef.current = open
	}, [open])

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const contextValue = useMemo<PopoverContextValue>(
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
