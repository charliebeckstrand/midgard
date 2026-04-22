'use client'

import {
	FloatingPortal,
	type Placement,
	safePolygon,
	useClick,
	useDismiss,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { isValidElement, useMemo, useState } from 'react'
import { cn } from '../../core'
import { useFloatingPanel, useHasHover } from '../../hooks'
import { ugoki } from '../../recipes'
import { k } from './variants'

export type TooltipProps = {
	placement?: Placement
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

	const { trigger, contentClassName, contentChildren } = useMemo(() => {
		const arr = Array.isArray(children) ? children : [children]

		let trigger: React.ReactNode = null
		let contentClassName: string | undefined
		let contentChildren: React.ReactNode = null

		for (const child of arr) {
			if (!isValidElement(child)) continue

			if (child.type === TooltipTrigger) {
				trigger = child
			} else if (child.type === TooltipContent) {
				const contentProps = child.props as TooltipContentProps

				contentClassName = contentProps.className
				contentChildren = contentProps.children
			}
		}

		return { trigger, contentClassName, contentChildren }
	}, [children])

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		onOpenChange: setOpen,
		offset: 8,
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
