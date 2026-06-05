'use client'

import { motion } from 'motion/react'
import { type KeyboardEventHandler, type ReactNode, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useRoving, useScrollWithin } from '../../hooks'
import { k } from '../../recipes/kata/popover'
import { ReducedMotion } from '../reduced-motion'

export function PopoverPanel({
	id,
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	glass = false,
	multiselectable,
	onKeyDown: onKeyDownProp,
}: {
	id?: string
	className?: string
	children: ReactNode
	role?: string
	itemSelector?: string
	autoFocus?: boolean
	/** Apply glass surface chrome instead of the default popover surface. */
	glass?: boolean
	/** Sets `aria-multiselectable` on a `role="listbox"` panel that allows multiple selections. */
	multiselectable?: boolean
	onKeyDown?: KeyboardEventHandler
}) {
	const panelRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(panelRef, { itemSelector, focusOnEmpty: true })

	const scrollWithin = useScrollWithin()

	useLayoutEffect(() => {
		if (!autoFocus || !panelRef.current) return

		const selected = panelRef.current.querySelector<HTMLElement>(`${itemSelector}[data-selected]`)

		if (selected) {
			selected.focus()

			scrollWithin(selected, { block: 'nearest' })
		} else {
			panelRef.current.focus()
		}
	}, [autoFocus, itemSelector, scrollWithin])

	return (
		<ReducedMotion>
			<motion.div
				ref={panelRef}
				id={id}
				data-slot="popover-panel"
				role={role}
				aria-multiselectable={multiselectable}
				tabIndex={-1}
				{...k.panel.motion}
				onKeyDown={(event) => {
					handleKeyDown(event)
					onKeyDownProp?.(event)
				}}
				className={cn(
					glass ? ['group/glass', k.panel.glass, k.panel.ring] : k.panel.surface,
					k.panel.base,
					className,
				)}
			>
				{children}
			</motion.div>
		</ReducedMotion>
	)
}
