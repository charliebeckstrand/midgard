'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	safePolygon,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { isValidElement, useState } from 'react'
import { cn } from '../../core'
import { useHasHover } from '../../hooks'
import { katachi, ugoki } from '../../recipes'

const k = katachi.tooltip

export type TooltipProps = {
	placement?: 'top' | 'bottom' | 'left' | 'right'
	delay?: number
	interactive?: boolean
	children: React.ReactNode
}

export type TooltipTriggerProps = {
	children: React.ReactNode
}

export type TooltipContentProps = {
	className?: string
	children: React.ReactNode
}

export function Tooltip({
	placement = 'top',
	delay = 250,
	interactive = false,
	children,
}: TooltipProps) {
	const [open, setOpen] = useState(false)

	let contentClassName: string | undefined

	let contentChildren: React.ReactNode = null

	const childArray = Array.isArray(children) ? children : [children]

	for (const child of childArray) {
		if (isValidElement(child) && child.type === TooltipContent) {
			const contentProps = child.props as TooltipContentProps

			contentClassName = contentProps.className
			contentChildren = contentProps.children
		}
	}

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 })],
	})

	const hasHover = useHasHover()

	const hover = useHover(context, {
		enabled: hasHover,
		delay: { open: delay, close: 100 },
		...(interactive && { handleClose: safePolygon() }),
	})

	const click = useClick(context, { enabled: !hasHover })

	const focus = useFocus(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'tooltip' })

	const { getReferenceProps, getFloatingProps } = useInteractions([
		hover,
		click,
		focus,
		dismiss,
		role,
	])

	let trigger: React.ReactNode = null

	for (const child of childArray) {
		if (isValidElement(child) && child.type === TooltipTrigger) {
			trigger = child
		}
	}

	return (
		<div
			ref={refs.setReference}
			data-slot="tooltip"
			className={k.trigger}
			{...(getReferenceProps() as React.HTMLAttributes<HTMLDivElement>)}
		>
			{trigger}
			<FloatingPortal>
				<AnimatePresence>
					{open && (
						<div
							ref={refs.setFloating}
							style={{
								...floatingStyles,
								pointerEvents: interactive ? 'auto' : 'none',
							}}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.tooltip}
								className={cn(k.content, interactive && 'pointer-events-auto', contentClassName)}
							>
								{contentChildren}
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</div>
	)
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
	if (isValidElement(children)) {
		return children
	}

	return <span>{children}</span>
}

export function TooltipContent(_props: TooltipContentProps) {
	return null
}
