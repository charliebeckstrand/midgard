'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	type Placement,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { cloneElement, isValidElement, useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { katachi, ugoki } from '../../recipes'

const k = katachi.popover

type PopoverContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: React.RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
	getReferenceProps: () => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
	onExitComplete?: () => void
}

const [PopoverProvider, usePopoverContext] = createContext<PopoverContextValue>('Popover')

export type PopoverProps = {
	placement?: Placement
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onExitComplete?: () => void
	className?: string
	children: React.ReactNode
}

export function Popover({
	placement = 'bottom',
	open: openProp,
	onOpenChange,
	onExitComplete,
	className,
	children,
}: PopoverProps) {
	const [internalOpen, setInternalOpen] = useState(false)

	const open = openProp !== undefined ? openProp : internalOpen

	const setOpen = useCallback(
		(value: boolean) => {
			if (openProp === undefined) setInternalOpen(value)
			onOpenChange?.(value)
		},
		[openProp, onOpenChange],
	)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 })],
	})

	const click = useClick(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'dialog' })

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	const close = useCallback(() => {
		setOpen(false)

		triggerRef.current?.focus()
	}, [setOpen])

	return (
		<PopoverProvider
			value={{
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
			}}
		>
			<div data-slot="popover" className={cn(className)}>
				{children}
			</div>
		</PopoverProvider>
	)
}

export type PopoverTriggerProps = {
	children: React.ReactNode
	className?: string
}

export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
	const { open, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current =
				node as HTMLButtonElement | null
			setReference(node)
		},
		[triggerRef, setReference],
	)

	const referenceProps = getReferenceProps()

	if (isValidElement(children)) {
		return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
			ref: mergeRefs,
			'aria-haspopup': 'dialog',
			'aria-expanded': open,
			'data-slot': 'popover-trigger',
			...referenceProps,
		})
	}

	return (
		<button
			ref={mergeRefs}
			type="button"
			aria-haspopup="dialog"
			aria-expanded={open}
			data-slot="popover-trigger"
			className={cn(k.trigger, className)}
			{...referenceProps}
		>
			{children}
		</button>
	)
}

export type PopoverContentProps = {
	className?: string
	children: React.ReactNode
}

export function PopoverContent({ className, children }: PopoverContentProps) {
	const { open, setFloating, floatingStyles, getFloatingProps, onExitComplete } =
		usePopoverContext()

	return (
		<FloatingPortal>
			<AnimatePresence onExitComplete={onExitComplete}>
				{open && (
					<div ref={setFloating} style={floatingStyles} className="z-100" {...getFloatingProps()}>
						<motion.div
							{...ugoki.popover}
							data-slot="popover-content"
							className={cn(k.content, className)}
						>
							{children}
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
