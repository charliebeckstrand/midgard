'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { cloneElement, isValidElement, useId } from 'react'
import { cn } from '../../core'
import { useDelayedToggle } from '../../hooks'
import { ugoki } from '../../recipes'
import { tooltipContentVariants, tooltipTriggerVariants } from './variants'

export type TooltipProps = {
	delayMs?: number
	children: React.ReactNode
}

export type TooltipTriggerProps = {
	children: React.ReactNode
}

export type TooltipContentProps = {
	placement?: 'top' | 'bottom' | 'left' | 'right'
	className?: string
	children: React.ReactNode
}

export function Tooltip({ delayMs = 700, children }: TooltipProps) {
	const tooltipId = useId()
	const { open, show, hide } = useDelayedToggle({ showDelay: delayMs })

	const triggerProps = {
		onMouseEnter: show,
		onMouseLeave: hide,
		onFocus: show,
		onBlur: hide,
		'aria-describedby': open ? tooltipId : undefined,
	}

	let trigger: React.ReactNode = null
	let content: React.ReactNode = null

	const childArray = Array.isArray(children) ? children : [children]

	for (const child of childArray) {
		if (isValidElement(child)) {
			if (child.type === TooltipTrigger) {
				trigger = cloneElement(
					child as React.ReactElement<{ _triggerProps: typeof triggerProps }>,
					{
						_triggerProps: triggerProps,
					},
				)
			} else if (child.type === TooltipContent) {
				content = cloneElement(
					child as React.ReactElement<{ _tooltipId: string; _open: boolean }>,
					{
						_tooltipId: tooltipId,
						_open: open,
					},
				)
			}
		}
	}

	return (
		<div data-slot="tooltip" className={tooltipTriggerVariants()}>
			{trigger}
			{content}
		</div>
	)
}

export function TooltipTrigger({
	children,
	...props
}: TooltipTriggerProps & { _triggerProps?: Record<string, unknown> }) {
	const triggerProps = props._triggerProps ?? {}

	if (isValidElement(children)) {
		return cloneElement(children as React.ReactElement<Record<string, unknown>>, triggerProps)
	}

	return <span {...triggerProps}>{children}</span>
}

export function TooltipContent({
	placement = 'top',
	className,
	children,
	...props
}: TooltipContentProps & { _tooltipId?: string; _open?: boolean }) {
	const tooltipId = props._tooltipId
	const open = props._open ?? false

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					{...ugoki.tooltip}
					role="tooltip"
					id={tooltipId}
					className={cn(tooltipContentVariants({ placement }), className)}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	)
}
