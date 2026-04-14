'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { useGlass } from '../components/glass/context'
import { cn } from '../core'
import { useRovingFocus } from '../hooks/use-keyboard'
import { kage, maru, omote, ugoki } from '../recipes'

export function PopoverPanel({
	id,
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	onKeyDown: onKeyDownProp,
}: {
	id?: string
	className?: string
	children: React.ReactNode
	role?: string
	itemSelector?: string
	autoFocus?: boolean
	onKeyDown?: React.KeyboardEventHandler
}) {
	const menuRef = useRef<HTMLDivElement>(null)

	const glass = useGlass()

	const handleKeyDown = useRovingFocus(menuRef, { itemSelector, focusOnEmpty: true })

	useEffect(() => {
		if (!autoFocus || !menuRef.current) return

		const selected = menuRef.current.querySelector<HTMLElement>(`${itemSelector}[data-selected]`)

		if (selected) {
			selected.focus()

			selected.scrollIntoView({ block: 'center' })
		} else {
			menuRef.current.focus()
		}
	}, [autoFocus, itemSelector])

	return (
		<motion.div
			ref={menuRef}
			id={id}
			role={role}
			tabIndex={-1}
			{...ugoki.popover}
			onKeyDown={(e) => {
				handleKeyDown(e)
				onKeyDownProp?.(e)
			}}
			data-glass={glass ? '' : undefined}
			className={cn(
				glass ? [omote.glass, kage.ring, 'group/glass'] : omote.popover,
				maru.rounded,
				'isolate absolute min-w-full',
				'p-1 space-y-0.5',
				'outline outline-transparent focus:outline-hidden',
				'overflow-y-auto overscroll-contain',
				'z-50 select-none',
				className,
			)}
		>
			{children}
		</motion.div>
	)
}
