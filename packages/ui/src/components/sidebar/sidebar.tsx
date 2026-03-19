'use client'

import { LayoutGroup, motion } from 'motion/react'
import type React from 'react'
import { useRef } from 'react'
import { cn } from '../../core'
import { useMenuKeyboard } from '../../hooks'
import { kage, sumi } from '../../recipes'

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	const ref = useRef<HTMLElement>(null)

	const onKeyDown = useMenuKeyboard(ref, '[data-slot="sidebar-item"]')

	return (
		<LayoutGroup>
			<nav
				ref={ref}
				data-slot="sidebar"
				onKeyDown={onKeyDown}
				{...props}
				className={cn('flex h-full min-h-0 flex-col', className)}
			/>
		</LayoutGroup>
	)
}

export function SidebarHeading({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
	return <h3 {...props} className={cn(`mb-1 px-2 text-xs/6 font-medium ${sumi.usui}`, className)} />
}

type DivProps = Omit<
	React.ComponentPropsWithoutRef<'div'>,
	'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'onAnimationEnd'
>

export function SidebarBody({ className, ...props }: DivProps) {
	return (
		<motion.div
			layoutScroll
			{...props}
			className={cn(
				'flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-4',
				className,
			)}
		/>
	)
}

export function SidebarFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={cn(
				`flex flex-col border-t ${kage.usui} p-4 [&>[data-slot=section]+[data-slot=section]]:mt-2.5`,
				className,
			)}
		/>
	)
}

export function SidebarSection({ className, ...props }: DivProps) {
	return <div {...props} data-slot="section" className={cn('flex flex-col gap-1', className)} />
}

export function SidebarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return <hr {...props} className={cn(`my-4 border-t ${kage.usui} lg:-mx-4`, className)} />
}

export function SidebarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={cn('mt-8 flex-1', className)} />
}
