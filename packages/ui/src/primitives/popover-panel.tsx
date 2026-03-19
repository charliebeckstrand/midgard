'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '../core'
import { useMenuKeyboard } from '../hooks/use-menu-keyboard'
import { omote, ugoki } from '../recipes'

export function PopoverPanel({
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	onKeyDown: onKeyDownProp,
}: {
	className?: string
	children: React.ReactNode
	role?: string
	itemSelector?: string
	autoFocus?: boolean
	onKeyDown?: React.KeyboardEventHandler
}) {
	const menuRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useMenuKeyboard(menuRef, itemSelector)

	useEffect(() => {
		if (autoFocus && menuRef.current) {
			menuRef.current.focus()
		}
	}, [autoFocus])

	return (
		<motion.div
			ref={menuRef}
			role={role}
			tabIndex={-1}
			{...ugoki.popover}
			onKeyDown={(e) => {
				handleKeyDown(e)
				onKeyDownProp?.(e)
			}}
			className={cn('absolute z-50', omote.popover, className)}
		>
			{children}
		</motion.div>
	)
}
