'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useCallback, useId, useState } from 'react'
import { cn } from '../../core/cn'
import { katachi, ugoki } from '../../recipes'
import { CollapseProvider, useCollapseContext } from './context'

const k = katachi.collapse

// ── Root ────────────────────────────────────────────────

export type CollapseProps = {
	/** Initial open state — uncontrolled. */
	defaultOpen?: boolean
	/** Controlled open state. */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
	/** Animation style for the panel. `true` or `'fade'` for height + opacity, `'slide'` for height only, `false` to disable. @default 'fade' */
	animate?: boolean | 'fade' | 'slide'
	/**
	 * Convenience trigger. When a string is passed it's rendered as muted
	 * text that highlights on hover. Any other ReactNode is rendered inside
	 * the toggle button with no special styling. Omit to use the compound
	 * API with <CollapseTrigger> and <CollapsePanel>.
	 */
	trigger?: React.ReactNode
	children: React.ReactNode
	className?: string
}

export function Collapse({
	defaultOpen = false,
	open: openProp,
	onOpenChange,
	animate: animateProp = 'fade',
	trigger,
	children,
	className,
}: CollapseProps) {
	const [uncontrolled, setUncontrolled] = useState(defaultOpen)

	const isControlled = openProp !== undefined

	const open = isControlled ? openProp : uncontrolled

	const toggle = useCallback(() => {
		const next = !open

		if (!isControlled) setUncontrolled(next)

		onOpenChange?.(next)
	}, [open, isControlled, onOpenChange])

	const panelId = useId()

	return (
		<CollapseProvider value={{ open, toggle, animate: animateProp, panelId }}>
			<div data-slot="collapse" data-open={open || undefined} className={cn(k.root, className)}>
				{trigger !== undefined ? (
					<>
						<CollapseTrigger>{trigger}</CollapseTrigger>
						<CollapsePanel>{children}</CollapsePanel>
					</>
				) : (
					children
				)}
			</div>
		</CollapseProvider>
	)
}

// ── Trigger ─────────────────────────────────────────────

export type CollapseTriggerProps = Omit<React.ComponentProps<'button'>, 'children'> & {
	children: React.ReactNode | ((bag: { open: boolean }) => React.ReactNode)
}

export function CollapseTrigger({ className, children, onClick, ...props }: CollapseTriggerProps) {
	const { open, toggle, panelId } = useCollapseContext()

	const rendered = typeof children === 'function' ? children({ open }) : children

	return (
		<button
			type="button"
			data-slot="collapse-trigger"
			aria-expanded={open}
			aria-controls={panelId}
			onClick={(e) => {
				toggle()
				onClick?.(e)
			}}
			className={cn(k.trigger, className)}
			{...props}
		>
			{rendered}
		</button>
	)
}

// ── Panel ───────────────────────────────────────────────

export type CollapsePanelProps = {
	children: React.ReactNode
	className?: string
}

export function CollapsePanel({ children, className }: CollapsePanelProps) {
	const { open, animate, panelId } = useCollapseContext()

	if (animate === false) {
		return open ? (
			<section id={panelId} data-slot="collapse-panel" className={cn(k.panel, className)}>
				{children}
			</section>
		) : null
	}

	const variant = animate === true || animate === 'fade' ? 'fade' : animate

	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.section
					id={panelId}
					data-slot="collapse-panel"
					{...ugoki.collapse[variant]}
					className={cn(k.panel, className)}
				>
					{children}
				</motion.section>
			)}
		</AnimatePresence>
	)
}
