'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { useMenuKeyboard } from '../hooks/use-menu-keyboard'
import { popoverAnimation } from '../recipes/motion'
import { popoverMenu } from '../recipes/popover'

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
			const items = menuRef.current.querySelectorAll<HTMLElement>(itemSelector)
			if (items.length > 0) items[0].focus()
			else menuRef.current.focus()
		}
	}, [autoFocus, itemSelector])

	return (
		<motion.div
			ref={menuRef}
			role={role}
			tabIndex={-1}
			{...popoverAnimation}
			onKeyDown={(e) => {
				handleKeyDown(e)
				onKeyDownProp?.(e)
			}}
			className={clsx('absolute z-50', popoverMenu, className)}
		>
			{children}
		</motion.div>
	)
}
