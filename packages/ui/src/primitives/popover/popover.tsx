'use client'

import { motion } from 'motion/react'
import { type KeyboardEventHandler, type ReactNode, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useRoving, useScrollWithin } from '../../hooks'
import { omote, sen, ugoki } from '../../recipes'
import { popover } from '../../recipes/waku/popover'
import { ReducedMotion } from '../reduced-motion'

export function PopoverPanel({
	id,
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	glass = false,
	onKeyDown: onKeyDownProp,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: {
	id?: string
	className?: string
	children: ReactNode
	role?: string
	itemSelector?: string
	autoFocus?: boolean
	/** Apply glass surface chrome instead of the default popover surface. */
	glass?: boolean
	onKeyDown?: KeyboardEventHandler
	/** Accessible name for the panel's `role`. Required when the role demands a name (`menu`, `listbox`, `tree`, etc.). */
	'aria-label'?: string
	/** External label reference; alternative to `aria-label`. */
	'aria-labelledby'?: string
}) {
	const menuRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(menuRef, { itemSelector, focusOnEmpty: true })

	const scrollWithin = useScrollWithin()

	useLayoutEffect(() => {
		if (!autoFocus || !menuRef.current) return

		const selected = menuRef.current.querySelector<HTMLElement>(`${itemSelector}[data-selected]`)

		if (selected) {
			selected.focus()

			scrollWithin(selected, { block: 'nearest' })
		} else {
			menuRef.current.focus()
		}
	}, [autoFocus, itemSelector, scrollWithin])

	return (
		<ReducedMotion>
			<motion.div
				ref={menuRef}
				id={id}
				data-slot="popover-panel"
				role={role}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				tabIndex={-1}
				{...ugoki.popover}
				onKeyDown={(e) => {
					handleKeyDown(e)
					onKeyDownProp?.(e)
				}}
				className={cn(
					glass ? ['group/glass', omote.glass, sen.ring] : omote.popover,
					popover.panel,
					className,
				)}
			>
				{children}
			</motion.div>
		</ReducedMotion>
	)
}
