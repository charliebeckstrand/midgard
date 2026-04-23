'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useLayoutEffect, useRef } from 'react'
import { useGlass } from '../components/glass/context'
import { cn } from '../core'
import { useScrollIntoContainer } from '../hooks'
import { useRoving } from '../hooks/use-keyboard'
import { omote, sen, ugoki } from '../recipes'
import { popover } from '../recipes/kata/popover'

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

	const handleKeyDown = useRoving(menuRef, { itemSelector, focusOnEmpty: true })

	const scrollIntoContainer = useScrollIntoContainer()

	useLayoutEffect(() => {
		if (!autoFocus || !menuRef.current) return

		const selected = menuRef.current.querySelector<HTMLElement>(`${itemSelector}[data-selected]`)

		if (selected) {
			selected.focus()

			scrollIntoContainer(selected, { block: 'nearest' })
		} else {
			menuRef.current.focus()
		}
	}, [autoFocus, itemSelector, scrollIntoContainer])

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
			className={cn(
				glass ? ['group/glass', omote.glass, sen.ring] : omote.popover,
				popover.panel,
				className,
			)}
		>
			{children}
		</motion.div>
	)
}
